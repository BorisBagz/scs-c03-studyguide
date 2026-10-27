// Simulacro realista: 65 preguntas ponderadas por dominio, 170 minutos,
// sin feedback hasta entregar, con marcas de revisión y navegación libre.
// El estado se guarda en localStorage: si se recarga la página o se sale,
// se puede retomar, y el reloj sigue corriendo como en el examen real.

const Sim = (() => {
  const KEY = "scs03_sim_v1";
  const SIZE = 65;
  const MINUTES = 170;
  const WARN_AT = [30, 10, 5, 1]; // avisos en minutos restantes

  let st = null; // estado persistido
  let qs = []; // preguntas, en el orden del simulacro
  let timer = null;
  let warned = new Set();
  let last = null; // último resultado, para filtrar la revisión
  let filter = "all";

  views.sim = $("#view-sim");
  views.simReview = $("#view-sim-review");

  // ---------- Persistencia ----------

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {
      /* sin almacenamiento: el simulacro sigue en memoria */
    }
  }

  function loadSaved() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      return s && Array.isArray(s.items) && s.deadline ? s : null;
    } catch (e) {
      return null;
    }
  }

  function discard() {
    stopTimer();
    st = null;
    qs = [];
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      /* nada que borrar */
    }
  }

  // ---------- Reloj ----------

  function remainingMs() {
    return st ? st.deadline - Date.now() : 0;
  }

  function clock(ms) {
    const t = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function tick() {
    if (!st) return;
    const ms = remainingMs();
    const mins = ms / 60000;
    document.querySelectorAll(".sim-timer").forEach((el) => {
      el.textContent = clock(ms);
      el.classList.toggle("is-warn", mins <= 15 && mins > 5);
      el.classList.toggle("is-danger", mins <= 5);
    });
    for (const w of WARN_AT) {
      if (mins <= w && mins > w - 1 && !warned.has(w)) {
        warned.add(w);
        const msg = w === 1 ? "Queda 1 minuto." : `Quedan ${w} minutos.`;
        $("#sim-live").textContent = msg;
        notice(msg);
      }
    }
    if (ms <= 0) finish(true);
  }

  function startTimer() {
    stopTimer();
    // No repetir avisos de umbrales que ya pasaron al retomar.
    const mins = remainingMs() / 60000;
    warned = new Set(WARN_AT.filter((w) => mins <= w - 1));
    tick();
    timer = setInterval(tick, 1000);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  // ---------- Estado de respuestas ----------

  function isAnswered(i) {
    const a = st.answers[i];
    if (a === undefined || a === null) return false;
    if (Array.isArray(a)) return a.length > 0;
    return qs[i].prompts.every((p) => a[p.id]);
  }

  function isFlagged(i) {
    return st.flags.includes(i);
  }

  function counts() {
    let answered = 0;
    qs.forEach((_, i) => isAnswered(i) && answered++);
    return { answered, unanswered: qs.length - answered, flagged: st.flags.length };
  }

  // ---------- Inicio / retomar ----------

  async function start() {
    const saved = loadSaved();
    if (saved && !confirm("Ya tienes un simulacro en curso. ¿Descartarlo y empezar uno nuevo?")) return;
    try {
      const list = await QuizEngine.pickExam(SIZE);
      const now = Date.now();
      st = {
        v: 1,
        items: list.map((q) => ({ id: q.id, domain: q._domain })),
        answers: {},
        flags: [],
        layout: {}, // orden inicial de ordering / opciones de matching, estable al navegar
        idx: 0,
        startedAt: now,
        deadline: now + MINUTES * 60000,
      };
      qs = list;
      save();
      enter(0);
    } catch (e) {
      notice(`No se pudo preparar el simulacro: ${e.message}`);
    }
  }

  async function resume() {
    const saved = loadSaved();
    if (!saved) return renderCard();
    try {
      const all = await QuizEngine.fetchAll();
      // Si el banco cambió y falta alguna pregunta, se descarta conservando el resto.
      const keep = [];
      saved.items.forEach((it, oldIdx) => all[it.id] && keep.push(oldIdx));
      const remap = (obj) => Object.fromEntries(keep.filter((o) => obj[o] !== undefined).map((o) => [keep.indexOf(o), obj[o]]));
      st = {
        ...saved,
        items: keep.map((o) => saved.items[o]),
        answers: remap(saved.answers),
        layout: remap(saved.layout || {}),
        flags: saved.flags.filter((o) => keep.includes(o)).map((o) => keep.indexOf(o)),
        idx: Math.max(0, Math.min(keep.indexOf(saved.idx), keep.length - 1)),
      };
      qs = st.items.map((it) => ({ ...all[it.id], _domain: it.domain }));
      if (!qs.length) {
        discard();
        return renderCard();
      }
      save();
      if (remainingMs() <= 0) return finish(true);
      enter(st.idx);
    } catch (e) {
      notice(`No se pudo retomar el simulacro: ${e.message}`);
    }
  }

  function enter(i) {
    $("#quiz-question-card").innerHTML = ""; // evita mezclar elementos con el quiz normal
    showView("sim");
    startTimer();
    go(i);
  }

  // ---------- Pregunta ----------

  function layoutFor(i) {
    const q = qs[i];
    if (st.layout[i]) return st.layout[i];
    let order = null;
    if (q.type === "ordering") {
      order = QuizEngine.shuffle(q.options.map((o) => o.id));
      for (let t = 0; t < 10 && order.every((id, k) => id === q.correct[k]); t++) order = QuizEngine.shuffle(order);
    } else if (q.type === "matching") {
      order = QuizEngine.shuffle(q.options.map((o) => o.id));
    }
    st.layout[i] = order;
    save();
    return order;
  }

  function bodyHTML(q, i, multi) {
    const ans = st.answers[i];
    const byId = Object.fromEntries(q.options.map((o) => [o.id, o]));
    if (q.type === "ordering") {
      const order = Array.isArray(ans) && ans.length ? ans : layoutFor(i);
      return `<ol class="ord" aria-labelledby="q-text">${order
        .map(
          (id, k) => `<li class="ord-item" data-id="${esc(id)}">
          <span class="ord-pos">${k + 1}</span>
          <span class="ord-text">${fmt(byId[id].text)}</span>
          <span class="ord-btns">
            <button type="button" class="ord-btn" data-move="-1" aria-label="Subir paso">&#9650;</button>
            <button type="button" class="ord-btn" data-move="1" aria-label="Bajar paso">&#9660;</button>
          </span>
        </li>`
        )
        .join("")}</ol>`;
    }
    if (q.type === "matching") {
      const choices = layoutFor(i).map((id) => byId[id]);
      return `<div class="match" aria-labelledby="q-text">${q.prompts
        .map((p) => {
          const sel = ans ? ans[p.id] : "";
          return `<div class="match-row" data-id="${esc(p.id)}">
          <p class="match-prompt">${fmt(p.text)}</p>
          <select class="match-select" data-prompt="${esc(p.id)}" aria-label="Respuesta para: ${esc(p.text)}">
            <option value="">Elige…</option>
            ${choices.map((o) => `<option value="${esc(o.id)}"${o.id === sel ? " selected" : ""}>${esc(o.text)}</option>`).join("")}
          </select>
        </div>`;
        })
        .join("")}</div>`;
    }
    const chosen = new Set(Array.isArray(ans) ? ans : []);
    return `<fieldset class="opts" aria-labelledby="q-text">${q.options
      .map(
        (o) => `<label class="opt" data-id="${esc(o.id)}">
        <input type="${multi ? "checkbox" : "radio"}" name="sim-option" value="${esc(o.id)}"${chosen.has(o.id) ? " checked" : ""} />
        <span class="opt-key">${esc(o.id.toUpperCase())}</span>
        <span class="opt-text">${fmt(o.text)}</span>
      </label>`
      )
      .join("")}</fieldset>`;
  }

  function isMulti(q) {
    return q.type === "multiple" || (q.type !== "ordering" && q.type !== "matching" && q.correct.length > 1);
  }

  function questionHead(q) {
    const paras = q.question.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
    const ask = paras.pop();
    return { paras, ask, lang: /[¿¡áéíóúñ]/i.test(q.question) ? "es" : "en" };
  }

  function go(i) {
    st.idx = Math.max(0, Math.min(i, qs.length - 1));
    save();
    const q = qs[st.idx];
    const multi = isMulti(q);
    const kind = multi
      ? "Elige todas las que apliquen"
      : q.type === "ordering"
      ? "Ordena los pasos (usa las flechas)"
      : q.type === "matching"
      ? "Empareja cada elemento con su respuesta"
      : "";
    const { paras, ask, lang } = questionHead(q);

    $("#sim-count").textContent = `${st.idx + 1} de ${qs.length}`;
    $("#sim-card").innerHTML = `<article class="q" lang="${lang}">
      ${kind ? `<p class="q-kind" lang="es">${kind}</p>` : ""}
      ${paras.length ? `<div class="q-context">${paras.map((x) => `<p>${fmt(x)}</p>`).join("")}</div>` : ""}
      <h2 class="q-text" id="q-text" tabindex="-1">${fmt(ask)}</h2>
      ${bodyHTML(q, st.idx, multi)}
    </article>`;
    if (q.type === "ordering") renumber();

    const flag = $("#sim-flag-btn");
    flag.setAttribute("aria-pressed", String(isFlagged(st.idx)));
    flag.querySelector("span").textContent = isFlagged(st.idx) ? "Marcada" : "Marcar";
    $("#sim-prev-btn").disabled = st.idx === 0;
    $("#sim-next-btn").textContent = st.idx === qs.length - 1 ? "Revisar" : "Siguiente";
    window.scrollTo(0, 0);
    $("#q-text").focus({ preventScroll: true });
  }

  function renumber() {
    const items = [...$("#sim-card").querySelectorAll(".ord-item")];
    items.forEach((li, k) => {
      li.querySelector(".ord-pos").textContent = k + 1;
      li.querySelector('[data-move="-1"]').disabled = k === 0;
      li.querySelector('[data-move="1"]').disabled = k === items.length - 1;
    });
  }

  function collect() {
    const q = qs[st.idx];
    const card = $("#sim-card");
    if (q.type === "ordering") return [...card.querySelectorAll(".ord-item")].map((li) => li.dataset.id);
    if (q.type === "matching") {
      const out = {};
      card.querySelectorAll(".match-select").forEach((el) => el.value && (out[el.dataset.prompt] = el.value));
      return out;
    }
    return [...card.querySelectorAll('input[name="sim-option"]:checked')].map((el) => el.value);
  }

  function store() {
    st.answers[st.idx] = collect();
    save();
  }

  $("#sim-card").addEventListener("change", store);
  $("#sim-card").addEventListener("click", (e) => {
    const btn = e.target.closest(".ord-btn");
    if (!btn || btn.disabled) return;
    const li = btn.closest(".ord-item");
    if (Number(btn.dataset.move) < 0 && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
    if (Number(btn.dataset.move) > 0 && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
    renumber();
    btn.disabled ? li.querySelector(".ord-btn:not(:disabled)")?.focus() : btn.focus();
    store();
  });

  $("#sim-prev-btn").addEventListener("click", () => go(st.idx - 1));
  $("#sim-next-btn").addEventListener("click", () => (st.idx === qs.length - 1 ? openReview() : go(st.idx + 1)));
  $("#sim-flag-btn").addEventListener("click", () => {
    st.flags = isFlagged(st.idx) ? st.flags.filter((x) => x !== st.idx) : [...st.flags, st.idx];
    save();
    const on = isFlagged(st.idx);
    const btn = $("#sim-flag-btn");
    btn.setAttribute("aria-pressed", String(on));
    btn.querySelector("span").textContent = on ? "Marcada" : "Marcar";
  });
  $("#sim-grid-btn").addEventListener("click", openReview);
  $("#sim-exit-btn").addEventListener("click", () => {
    if (!confirm("El simulacro queda guardado y el reloj sigue corriendo, como en el examen real. ¿Salir por ahora?")) return;
    stopTimer();
    renderHome();
    showView("home");
  });

  // ---------- Revisión antes de entregar ----------

  function openReview() {
    const c = counts();
    $("#sim-review-body").innerHTML = `<div class="sim-review">
      <h1 tabindex="-1" data-focus>Revisa antes de entregar</h1>
      <p class="lede">Toca un número para volver a esa pregunta. Las respuestas se guardan solas.</p>
      <ul class="sim-stats">
        <li><span class="fig">${c.answered}</span><span class="cap">respondidas</span></li>
        <li class="${c.unanswered ? "is-alert" : ""}"><span class="fig">${c.unanswered}</span><span class="cap">sin responder</span></li>
        <li><span class="fig">${c.flagged}</span><span class="cap">marcadas</span></li>
      </ul>
      <div class="sim-legend" aria-hidden="true">
        <span><i class="lg is-answered"></i>Respondida</span>
        <span><i class="lg"></i>Sin responder</span>
        <span><i class="lg is-flagged"></i>Marcada</span>
      </div>
      <ol class="sim-grid">${qs
        .map((_, i) => {
          const a = isAnswered(i);
          const f = isFlagged(i);
          const label = `Pregunta ${i + 1}: ${a ? "respondida" : "sin responder"}${f ? ", marcada para revisión" : ""}`;
          return `<li><button type="button" class="sim-cell${a ? " is-answered" : ""}${f ? " is-flagged" : ""}${i === st.idx ? " is-current" : ""}" data-go="${i}" aria-label="${label}">${i + 1}</button></li>`;
        })
        .join("")}</ol>
      <div class="sim-review-actions">
        ${c.flagged ? `<button type="button" class="btn btn-secondary" id="sim-first-flag">Ir a la primera marcada</button>` : ""}
        ${c.unanswered ? `<button type="button" class="btn btn-secondary" id="sim-first-empty">Ir a la primera sin responder</button>` : ""}
        <button type="button" class="btn btn-primary" id="sim-finish-btn">Terminar examen</button>
      </div>
    </div>`;
    showView("simReview");
    tick();
  }

  $("#sim-review-body").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-go]");
    if (cell) return backTo(Number(cell.dataset.go));
    if (e.target.closest("#sim-first-flag")) return backTo(Math.min(...st.flags));
    if (e.target.closest("#sim-first-empty")) return backTo(qs.findIndex((_, i) => !isAnswered(i)));
    if (e.target.closest("#sim-finish-btn")) {
      const { unanswered } = counts();
      const msg = unanswered
        ? `Tienes ${plural(unanswered, "pregunta", "preguntas")} sin responder, que contarán como incorrectas. ¿Terminar el examen?`
        : "¿Terminar el examen? Ya no podrás cambiar las respuestas.";
      if (confirm(msg)) finish(false);
    }
  });
  $("#sim-review-back-btn").addEventListener("click", () => backTo(st.idx));

  function backTo(i) {
    showView("sim");
    go(i);
  }

  // ---------- Entrega y resultado ----------

  function finish(timeUp) {
    if (!st) return;
    stopTimer();
    const used = Math.min(Date.now(), st.deadline) - st.startedAt;
    const rows = qs.map((q, i) => ({ q, i, given: st.answers[i], ok: QuizEngine.grade(q, st.answers[i]), flagged: isFlagged(i), answered: isAnswered(i) }));
    const byDomain = {};
    rows.forEach((r) => {
      const b = (byDomain[r.q._domain] = byDomain[r.q._domain] || { score: 0, total: 0 });
      b.total++;
      if (r.ok) b.score++;
    });
    DOMAINS.forEach((d) => byDomain[d.id] && recordAttempt(d.id, byDomain[d.id].score, byDomain[d.id].total));
    rows.filter((r) => !r.ok).forEach((r) => recordFailedQuestion(r.q._domain, r.q.id));

    last = { rows, byDomain, used, timeUp, score: rows.filter((r) => r.ok).length };
    filter = "all";
    discard();
    renderResult();
    showView("results");
  }

  function minutes(ms) {
    const m = Math.round(ms / 60000);
    return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
  }

  function renderResult() {
    const r = last;
    const total = r.rows.length;
    const pct = Math.round((r.score / total) * 100);
    const wrong = r.rows.filter((x) => !x.ok).length;
    const flagged = r.rows.filter((x) => x.flagged).length;
    const unanswered = r.rows.filter((x) => !x.answered).length;

    const breakdown = DOMAINS.filter((d) => r.byDomain[d.id])
      .map((d) => {
        const b = r.byDomain[d.id];
        const p = Math.round((b.score / b.total) * 100);
        return `<li style="--c:${d.color}"><span class="attempt-domain"><span class="dot"></span>${esc(d.name)}</span><span class="attempt-score">${b.score}/${b.total}</span><div class="meter" role="img" aria-label="${p}% de aciertos"><span style="width:${p}%"></span></div></li>`;
      })
      .join("");

    $("#results-card").innerHTML = `<article class="result" style="--c:#14243B">
      <h1 tabindex="-1" data-focus>Simulacro realista</h1>
      <p class="result-sub">${r.timeUp ? "Se acabó el tiempo: se calificaron las respuestas guardadas" : "Examen entregado"} · ${minutes(r.used)} de ${MINUTES} min</p>
      <p class="result-score"><span>${r.score} de ${total} correctas</span><span class="result-pct">${pct}%</span></p>
      ${unanswered ? `<p class="result-note">${plural(unanswered, "pregunta quedó", "preguntas quedaron")} sin responder.</p>` : ""}
      <ul class="breakdown" aria-label="Resultado por dominio">${breakdown}</ul>
      <p class="result-note">Referencia: el examen real se aprueba con 750 sobre 1000 en una escala propia de AWS, con 15 preguntas que no puntúan. Este porcentaje es orientativo y no equivale a esa escala.</p>
      <div class="result-actions">
        <button class="btn btn-primary" id="sim-again-btn">Nuevo simulacro</button>
        <button class="btn btn-secondary" id="sim-home-btn">Volver al inicio</button>
      </div>
    </article>
    <section class="sim-answers" aria-labelledby="sim-answers-title">
      <h2 id="sim-answers-title" class="section-title">Revisión de respuestas</h2>
      <div class="sim-filters" role="group" aria-label="Filtrar preguntas">
        ${[
          ["all", `Todas · ${total}`],
          ["wrong", `Incorrectas · ${wrong}`],
          ["flagged", `Marcadas · ${flagged}`],
        ]
          .map(([k, label]) => `<button type="button" class="filter-chip" data-filter="${k}" aria-pressed="${filter === k}">${label}</button>`)
          .join("")}
      </div>
      <ol class="sim-answer-list">${answerListHTML()}</ol>
    </section>`;

    $("#sim-again-btn").addEventListener("click", start);
    $("#sim-home-btn").addEventListener("click", () => {
      renderHome();
      showView("home");
    });
    $("#results-card").querySelector(".sim-filters").addEventListener("click", (e) => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      filter = b.dataset.filter;
      $("#results-card").querySelectorAll("[data-filter]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.filter === filter)));
      $("#results-card").querySelector(".sim-answer-list").innerHTML = answerListHTML();
    });
  }

  function answerListHTML() {
    const rows = last.rows.filter((r) => (filter === "wrong" ? !r.ok : filter === "flagged" ? r.flagged : true));
    if (!rows.length) return `<li class="empty">${filter === "flagged" ? "No marcaste preguntas." : "No hay preguntas incorrectas."}</li>`;
    return rows.map(answerItemHTML).join("");
  }

  function answerItemHTML(r) {
    const { q } = r;
    const d = DOMAINS.find((x) => x.id === q._domain);
    const { paras, ask, lang } = questionHead(q);
    const byId = Object.fromEntries(q.options.map((o) => [o.id, o.text]));
    const status = r.ok ? "Correcta" : r.answered ? "Incorrecta" : "Sin responder";
    let detail;

    if (q.type === "ordering") {
      const yours = Array.isArray(r.given) && r.given.length ? r.given : null;
      detail = `<div class="sim-cmp">
        <div><p class="sim-cmp-h">Tu orden</p>${
          yours ? `<ol>${yours.map((id, k) => `<li class="${id === q.correct[k] ? "is-ok" : "is-bad"}">${fmt(byId[id])}</li>`).join("")}</ol>` : `<p class="muted">Sin responder</p>`
        }</div>
        <div><p class="sim-cmp-h">Orden correcto</p><ol>${q.correct.map((id) => `<li>${fmt(byId[id])}</li>`).join("")}</ol></div>
      </div>`;
    } else if (q.type === "matching") {
      detail = `<ul class="sim-match">${q.prompts
        .map((p) => {
          const g = r.given && r.given[p.id];
          const ok = g === q.correct[p.id];
          return `<li class="${ok ? "is-ok" : "is-bad"}"><p class="match-prompt">${fmt(p.text)}</p>
            <p><span class="muted">Tu respuesta:</span> ${g ? esc(byId[g]) : "—"}</p>
            ${ok ? "" : `<p><span class="muted">Correcta:</span> ${esc(byId[q.correct[p.id]])}</p>`}</li>`;
        })
        .join("")}</ul>`;
    } else {
      const chosen = new Set(Array.isArray(r.given) ? r.given : []);
      const correct = new Set(q.correct);
      detail = `<ul class="sim-opts">${q.options
        .map((o) => {
          const cls = correct.has(o.id) ? "is-ok" : chosen.has(o.id) ? "is-bad" : "";
          const tag = correct.has(o.id) && chosen.has(o.id) ? "Tu respuesta · correcta" : correct.has(o.id) ? "Correcta" : chosen.has(o.id) ? "Tu respuesta" : "";
          return `<li class="${cls}"><span class="opt-key">${esc(o.id.toUpperCase())}</span><span>${fmt(o.text)}${tag ? `<em class="sim-tag" lang="es">${tag}</em>` : ""}</span></li>`;
        })
        .join("")}</ul>`;
    }

    const link = /^https:\/\//.test(q.reference || "")
      ? `<a class="feedback-link" href="${esc(q.reference)}" target="_blank" rel="noopener">Ver en la documentación de AWS</a>`
      : "";

    return `<li class="sim-answer ${r.ok ? "is-ok" : "is-bad"}" style="--c:${d.color}">
      <details>
        <summary>
          <span class="sim-n">${r.i + 1}</span>
          <span class="sim-sum">
            <span class="sim-meta"><span class="sim-status">${status}</span> · ${esc(d.short)}${r.flagged ? " · Marcada" : ""}</span>
            <span class="sim-ask" lang="${lang}">${esc(ask)}</span>
          </span>
        </summary>
        <div class="sim-detail">
          <div lang="${lang}">
            ${paras.map((x) => `<p class="sim-ctx">${fmt(x)}</p>`).join("")}
            ${detail}
          </div>
          <p class="feedback-body">${fmt(q.explanation)}</p>
          ${link}
        </div>
      </details>
    </li>`;
  }

  // ---------- Tarjeta en la portada ----------

  function renderCard() {
    const counts = DOMAINS.map((d) => questionCounts[d.id]);
    const loaded = counts.every((c) => c !== undefined);
    const total = counts.reduce((s, c) => s + (c || 0), 0);
    const saved = loadSaved();
    const sub = $("#sim-sub");
    const actions = $("#sim-actions");
    if (saved) {
      const left = saved.deadline - Date.now();
      const answered = Object.values(saved.answers).filter((a) => (Array.isArray(a) ? a.length : a && Object.keys(a).length)).length;
      sub.textContent =
        left > 0
          ? `En curso: ${answered} de ${saved.items.length} respondidas · quedan ${clock(left)}.`
          : "Se acabó el tiempo del simulacro en curso. Ábrelo para ver tu resultado.";
      actions.innerHTML = `<button id="sim-discard-btn" class="btn btn-secondary">Descartar</button>
        <button id="sim-resume-btn" class="btn btn-primary">${left > 0 ? "Retomar" : "Ver resultado"}</button>`;
    } else {
      sub.textContent = `${Math.min(SIZE, total) || SIZE} preguntas · ${MINUTES} minutos · sin ver respuestas hasta el final.`;
      actions.innerHTML = `<button id="sim-start-btn" class="btn btn-primary"${!loaded || total === 0 ? " disabled" : ""}>Empezar simulacro</button>`;
    }
  }

  $("#sim-actions").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    if (b.id === "sim-start-btn") start();
    else if (b.id === "sim-resume-btn") resume();
    else if (b.id === "sim-discard-btn" && confirm("¿Descartar el simulacro en curso? No se guardará ningún resultado.")) {
      discard();
      renderCard();
    }
  });

  renderCard();
  return { renderCard, SIZE, MINUTES };
})();
