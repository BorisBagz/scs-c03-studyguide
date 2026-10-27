// Interfaz: vistas (dominios / quiz / resultado / progreso) y su render.

const $ = (sel) => document.querySelector(sel);

const views = {
  home: $("#view-home"),
  quiz: $("#view-quiz"),
  results: $("#view-results"),
  progress: $("#view-progress"),
  theory: $("#view-theory"),
  domain: $("#view-domain"),
  topic: $("#view-topic"),
};

const questionCounts = {}; // domainId -> numero | null (error) | undefined (cargando)
let activeDomain = null;
let activeSpec = null;
let introPlayed = false;

const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ICON_CROSS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

// ---------- Utilidades ----------

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Texto del banco de preguntas: se escapa y `codigo` se muestra como <code>.
function fmt(s) {
  return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function notice(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "alert");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

// ---------- Navegación ----------

function showView(name) {
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
  document.body.dataset.view = name;
  const tab = name === "progress" ? "progress" : ["theory", "domain", "topic"].includes(name) ? "theory" : "home";
  document.querySelectorAll(".tab").forEach((btn) => {
    if (btn.dataset.view === tab) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  const target = views[name].querySelector("[data-focus]");
  if (target) target.focus({ preventScroll: true });
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.view === "theory") {
      if (location.hash === "#/teoria") Theory.route();
      else location.hash = "#/teoria";
    } else if (btn.dataset.view === "progress") {
      renderProgress();
      showView("progress");
      syncFromRemote().then((changed) => changed && renderProgress());
    } else {
      if (location.hash) history.replaceState(null, "", location.pathname + location.search);
      renderHome();
      showView("home");
    }
  });
});

// ---------- Plano del examen ----------

function blueprintHTML({ link, intro }) {
  const cols = DOMAINS.map((d, i) => {
    const m = getDomainMastery(d.id);
    const label = `${d.name}: ${d.weight}% del examen, ${m === null ? "sin evaluar" : `dominio ${m}%`}`;
    const attrs = link ? ` href="#row-${d.id}"` : ' role="img"';
    const tag = link ? "a" : "div";
    return `<${tag} class="col"${attrs} aria-label="${esc(label)}"
        style="--w:${d.weight};--c:${d.color};--t:${d.tint};--fill:${m ?? 0}%;--i:${i}">
      <span class="col-weight" aria-hidden="true">${d.weight}%</span>
      <span class="seg${m === null ? " is-unrated" : ""}"><span class="seg-fill"></span></span>
      <span class="col-name" aria-hidden="true">${esc(d.short)}</span>
    </${tag}>`;
  }).join("");
  return `<div class="blueprint${intro ? " is-intro" : ""}" role="group" aria-label="Dominios del examen">${cols}</div>`;
}

// ---------- Vista: dominios ----------

function rowHTML(d) {
  const count = questionCounts[d.id];
  const m = getDomainMastery(d.id);
  const stats = getDomainStats(d.id);

  let sub;
  if (count === undefined) sub = "Cargando preguntas…";
  else if (count === null) sub = "No se pudo cargar el banco de preguntas";
  else if (count === 0) sub = "Preguntas en preparación";
  else sub = plural(count, "pregunta", "preguntas");

  const mastery =
    m === null
      ? count === 0
        ? ""
        : '<span class="cap">Sin evaluar</span>'
      : `<div class="meter"><span style="width:${m}%"></span></div>
         <span class="cap">${m}% · ${plural(stats.attempts, "intento", "intentos")}</span>`;

  const enabled = count === null || count > 0;
  return `<li class="row" id="row-${d.id}" style="--c:${d.color};--t:${d.tint}">
    <div>
      <h2 class="row-name">${esc(d.name)}</h2>
      <p class="row-sub">${sub}</p>
    </div>
    <div class="row-weight"><span class="fig">${d.weight}%</span><span class="cap">del examen</span></div>
    <div class="row-mastery">${mastery}</div>
    ${
      count === 0
        ? ""
        : `<div class="row-actions">
      ${count > QuizEngine.QUICK_SIZE ? `<button class="btn btn-primary" data-domain="${d.id}" data-mode="quick" ${enabled ? "" : "disabled"}>Rápido · ${QuizEngine.QUICK_SIZE}</button>` : ""}
      <button class="btn ${count > QuizEngine.QUICK_SIZE ? "btn-secondary" : "btn-primary"}" data-domain="${d.id}" data-mode="all" ${enabled ? "" : "disabled"}>${count ? `Todas · ${count}` : "Practicar"}</button>
    </div>`
    }
  </li>`;
}

function renderRows() {
  $("#domain-list").innerHTML = DOMAINS.map(rowHTML).join("");
  renderExamCard();
}

function renderHome() {
  $("#blueprint-home").innerHTML = blueprintHTML({ link: true, intro: !introPlayed });
  introPlayed = true;
  const rated = DOMAINS.filter((d) => getDomainMastery(d.id) !== null).length;
  $("#blueprint-note").textContent =
    rated === 0
      ? "Aún no hay intentos. Elige un dominio y completa un quiz para llenar su columna."
      : `${rated} de ${DOMAINS.length} dominios evaluados.`;
  renderRows();
}

$("#domain-list").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-domain]");
  if (!btn || btn.disabled) return;
  const domain = DOMAINS.find((d) => d.id === btn.dataset.domain);
  startQuiz({ kind: "domain", domain, limit: btn.dataset.mode === "quick" ? QuizEngine.QUICK_SIZE : 0 });
});

$("#exam-start-btn").addEventListener("click", (e) => {
  if (!e.currentTarget.disabled) startQuiz({ kind: "exam" });
});
$("#exam-short-btn").addEventListener("click", (e) => {
  if (!e.currentTarget.disabled) startQuiz({ kind: "exam", size: QuizEngine.SHORT_SIZE });
});

function renderExamCard() {
  const counts = DOMAINS.map((d) => questionCounts[d.id]);
  const loaded = counts.every((c) => c !== undefined);
  const total = counts.reduce((s, c) => s + (c || 0), 0);
  const n = Math.min(QuizEngine.EXAM_SIZE, total);
  $("#exam-sub").textContent = !loaded
    ? "Cargando preguntas…"
    : total === 0
    ? "Aún no hay preguntas."
    : `Examen de ${n} o test corto de ${Math.min(QuizEngine.SHORT_SIZE, total)}: preguntas aleatorias de los 6 dominios, repartidas según su peso en el examen.`;
  $("#exam-start-btn").disabled = !loaded || total === 0;
  $("#exam-short-btn").disabled = !loaded || total === 0;
}

async function loadQuestionCounts() {
  await Promise.all(
    DOMAINS.map(async (d) => {
      try {
        const res = await fetch(`data/questions/${d.file}`, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        questionCounts[d.id] = (await res.json()).questions.length;
      } catch (e) {
        console.warn(`No se pudo contar preguntas de ${d.id}:`, e);
        questionCounts[d.id] = null;
      }
    })
  );
  renderRows();
  renderExamCard();
}

// ---------- Vista: quiz ----------

async function startQuiz(spec) {
  try {
    const count = await QuizEngine.load(spec);
    if (count === 0) {
      notice("Aún no hay preguntas para este quiz.");
      return;
    }
    activeSpec = spec;
    activeDomain = spec.kind === "exam" ? { id: "exam", name: spec.size ? "Test corto" : "Examen completo", color: "#14243B", tint: "#D9DFEA" } : spec.domain;
    views.quiz.style.setProperty("--c", activeDomain.color);
    showView("quiz");
    renderQuestion();
  } catch (e) {
    notice(`No se pudo cargar el quiz: ${e.message}`);
  }
}

function renderSteps() {
  const idx = QuizEngine.getCurrentIndex();
  $("#quiz-steps").innerHTML = QuizEngine.getOutcomes()
    .map((o, i) => `<span class="step${o !== null ? " is-done" : i === idx ? " is-current" : ""}"></span>`)
    .join("");
}

function shuffled(arr) {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function orderingItemHTML(o, pos) {
  return `<li class="ord-item" data-id="${esc(o.id)}">
    <span class="ord-pos">${pos}</span>
    <span class="ord-text">${fmt(o.text)}</span>
    <span class="ord-btns">
      <button type="button" class="ord-btn" data-move="-1" aria-label="Subir paso">&#9650;</button>
      <button type="button" class="ord-btn" data-move="1" aria-label="Bajar paso">&#9660;</button>
    </span>
    <span class="opt-mark" aria-hidden="true"></span>
  </li>`;
}

function renumberOrdering() {
  const items = [...document.querySelectorAll(".ord-item")];
  items.forEach((li, i) => {
    li.querySelector(".ord-pos").textContent = i + 1;
    li.querySelector('[data-move="-1"]').disabled = i === 0;
    li.querySelector('[data-move="1"]').disabled = i === items.length - 1;
  });
}

function questionBodyHTML(q, multi) {
  if (q.type === "ordering") {
    let order = shuffled(q.options);
    for (let t = 0; t < 10 && order.every((o, i) => o.id === q.correct[i]); t++) order = shuffled(q.options);
    return `<ol class="ord" aria-labelledby="q-text">${order.map((o, i) => orderingItemHTML(o, i + 1)).join("")}</ol>`;
  }
  if (q.type === "matching") {
    const choices = shuffled(q.options);
    return `<div class="match" aria-labelledby="q-text">${q.prompts
      .map(
        (p) => `<div class="match-row" data-id="${esc(p.id)}">
        <p class="match-prompt">${fmt(p.text)}</p>
        <select class="match-select" data-prompt="${esc(p.id)}" aria-label="Respuesta para: ${esc(p.text)}">
          <option value="">Elige…</option>
          ${choices.map((o) => `<option value="${esc(o.id)}">${esc(o.text)}</option>`).join("")}
        </select>
        <span class="opt-mark" aria-hidden="true"></span>
      </div>`
      )
      .join("")}</div>`;
  }
  return `<fieldset class="opts" aria-labelledby="q-text">
      ${q.options
        .map(
          (o) => `<label class="opt" data-id="${esc(o.id)}">
        <input type="${multi ? "checkbox" : "radio"}" name="quiz-option" value="${esc(o.id)}" />
        <span class="opt-key">${esc(o.id.toUpperCase())}</span>
        <span class="opt-text">${fmt(o.text)}</span>
        <span class="opt-mark" aria-hidden="true"></span>
      </label>`
        )
        .join("")}
    </fieldset>`;
}

function renderQuestion() {
  const q = QuizEngine.getCurrentQuestion();
  const multi = q.type === "multiple" || (q.type !== "ordering" && q.type !== "matching" && q.correct.length > 1);
  const kind = multi
    ? "Elige todas las que apliquen"
    : q.type === "scenario"
    ? "Escenario: elige una respuesta"
    : q.type === "ordering"
    ? "Ordena los pasos (usa las flechas)"
    : q.type === "matching"
    ? "Empareja cada elemento con su respuesta"
    : "";

  $("#quiz-progress-label").textContent = `${QuizEngine.getCurrentIndex() + 1} de ${QuizEngine.getTotal()}`;
  renderSteps();

  // Escenarios largos: párrafos de contexto + la pregunta final destacada.
  const paras = q.question.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const ask = paras.pop();
  const lang = /[¿¡áéíóúñ]/i.test(q.question) ? "es" : "en";

  $("#quiz-question-card").innerHTML = `<article class="q" lang="${lang}">
    ${kind ? `<p class="q-kind" lang="es">${kind}</p>` : ""}
    ${paras.length ? `<div class="q-context">${paras.map((x) => `<p>${fmt(x)}</p>`).join("")}</div>` : ""}
    <h2 class="q-text" id="q-text" tabindex="-1">${fmt(ask)}</h2>
    ${questionBodyHTML(q, multi)}
    <div id="quiz-feedback" class="feedback hidden" role="status" aria-live="polite" lang="es"></div>
  </article>`;

  const submit = $("#quiz-submit-btn");
  submit.disabled = q.type !== "ordering";
  submit.classList.remove("hidden");
  $("#quiz-next-btn").classList.add("hidden");
  if (q.type === "ordering") renumberOrdering();
  window.scrollTo(0, 0);
  $("#q-text").focus({ preventScroll: true });
}

$("#quiz-question-card").addEventListener("change", (e) => {
  if (e.target.name === "quiz-option") {
    $("#quiz-submit-btn").disabled = false;
  } else if (e.target.classList.contains("match-select")) {
    const all = [...document.querySelectorAll(".match-select")].every((el) => el.value);
    $("#quiz-submit-btn").disabled = !all;
  }
});

$("#quiz-question-card").addEventListener("click", (e) => {
  const btn = e.target.closest(".ord-btn");
  if (!btn || btn.disabled) return;
  const li = btn.closest(".ord-item");
  const dir = Number(btn.dataset.move);
  if (dir < 0 && li.previousElementSibling) li.parentNode.insertBefore(li, li.previousElementSibling);
  if (dir > 0 && li.nextElementSibling) li.parentNode.insertBefore(li.nextElementSibling, li);
  renumberOrdering();
  btn.focus();
});

function collectAnswer(q) {
  if (q.type === "ordering") return [...document.querySelectorAll(".ord-item")].map((li) => li.dataset.id);
  if (q.type === "matching") {
    const out = {};
    document.querySelectorAll(".match-select").forEach((el) => (out[el.dataset.prompt] = el.value));
    return out;
  }
  return Array.from(document.querySelectorAll('input[name="quiz-option"]:checked')).map((el) => el.value);
}

$("#quiz-submit-btn").addEventListener("click", () => {
  const q = QuizEngine.getCurrentQuestion();
  const selected = collectAnswer(q);
  if (Array.isArray(selected) ? selected.length === 0 : false) return;
  QuizEngine.submitAnswer(selected);
  revealAnswer(selected);
  $("#quiz-submit-btn").classList.add("hidden");
  const next = $("#quiz-next-btn");
  next.textContent = QuizEngine.hasNext() ? "Siguiente pregunta" : "Ver resultado";
  next.classList.remove("hidden");
  renderSteps();
});

function revealAnswer(selected) {
  const q = QuizEngine.getCurrentQuestion();
  const ok = QuizEngine.isCorrect();
  document.querySelector(".q").classList.add("is-revealed");
  const mark = (el, good) => {
    const m = el.querySelector(".opt-mark");
    el.classList.add(good ? "is-correct" : "is-wrong");
    m.innerHTML = good
      ? `${ICON_CHECK}<span class="sr-only">Correcto</span>`
      : `${ICON_CROSS}<span class="sr-only">Incorrecto</span>`;
  };
  let answerLine = "";

  if (q.type === "ordering") {
    document.querySelectorAll(".ord-item").forEach((li, i) => {
      mark(li, li.dataset.id === q.correct[i]);
      li.querySelectorAll(".ord-btn").forEach((b) => (b.disabled = true));
    });
    if (!ok) {
      const byId = Object.fromEntries(q.options.map((o) => [o.id, o.text]));
      answerLine = `<p class="feedback-answer">Orden correcto:</p><ol class="feedback-order">${q.correct
        .map((id) => `<li>${fmt(byId[id])}</li>`)
        .join("")}</ol>`;
    }
  } else if (q.type === "matching") {
    const byId = Object.fromEntries(q.options.map((o) => [o.id, o.text]));
    document.querySelectorAll(".match-row").forEach((row) => {
      const pid = row.dataset.id;
      const good = selected[pid] === q.correct[pid];
      row.querySelector("select").disabled = true;
      mark(row, good);
      if (!good) {
        const p = document.createElement("p");
        p.className = "match-fix";
        p.textContent = `Correcto: ${byId[q.correct[pid]]}`;
        row.appendChild(p);
      }
    });
  } else {
    const correct = new Set(q.correct);
    document.querySelectorAll(".opt").forEach((label) => {
      const id = label.dataset.id;
      label.querySelector("input").disabled = true;
      if (correct.has(id)) {
        label.classList.add("is-correct");
        label.querySelector(".opt-mark").innerHTML = `${ICON_CHECK}<span class="sr-only">Respuesta correcta</span>`;
      } else if (selected.includes(id)) {
        label.classList.add("is-wrong");
        label.querySelector(".opt-mark").innerHTML = `${ICON_CROSS}<span class="sr-only">Respuesta incorrecta</span>`;
      }
    });
    const letters = q.correct.map((id) => id.toUpperCase());
    answerLine = ok
      ? ""
      : `<p class="feedback-answer">${letters.length > 1 ? "Las respuestas correctas son" : "La respuesta correcta es"} ${joinList(letters)}.</p>`;
  }
  const link = /^https:\/\//.test(q.reference || "")
    ? `<a class="feedback-link" href="${esc(q.reference)}" target="_blank" rel="noopener">Ver en la documentación de AWS</a>`
    : "";

  const fb = $("#quiz-feedback");
  fb.className = `feedback${ok ? "" : " is-wrong"}`;
  fb.innerHTML = `<p class="feedback-title">${ok ? "Correcto" : "Incorrecto"}</p>
    ${answerLine}
    <p class="feedback-body">${fmt(q.explanation)}</p>
    ${link}`;
  fb.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

$("#quiz-next-btn").addEventListener("click", () => {
  if (QuizEngine.hasNext()) {
    QuizEngine.next();
    renderQuestion();
  } else {
    finishQuiz();
  }
});

$("#quiz-exit-btn").addEventListener("click", () => {
  const started = QuizEngine.getOutcomes().some((o) => o !== null);
  if (started && !confirm("¿Salir del quiz? Este intento no se guardará.")) return;
  renderHome();
  showView("home");
});

// ---------- Vista: resultado ----------

function finishQuiz() {
  const r = QuizEngine.computeResults();
  const isExam = activeSpec.kind === "exam";
  // El examen completo se registra como un intento por dominio (el esquema de sync no cambia).
  if (isExam) {
    DOMAINS.forEach((d) => {
      const bd = r.byDomain[d.id];
      if (bd && bd.total > 0) recordAttempt(d.id, bd.score, bd.total);
    });
  } else {
    recordAttempt(r.domain, r.score, r.total);
  }
  r.failed.forEach((f) => recordFailedQuestion(f.domain, f.id));

  const d = activeDomain;
  const pct = Math.round((r.score / r.total) * 100);
  const note = r.failedIds.length
    ? `${plural(r.failedIds.length, "pregunta guardada", "preguntas guardadas")} para repaso.`
    : "Acertaste todas.";
  const breakdown = isExam
    ? `<ul class="breakdown" aria-label="Resultado por dominio">${DOMAINS.filter((x) => r.byDomain[x.id])
        .map((x) => {
          const b = r.byDomain[x.id];
          const p = Math.round((b.score / b.total) * 100);
          return `<li style="--c:${x.color}"><span class="attempt-domain"><span class="dot"></span>${esc(x.name)}</span><span class="attempt-score">${b.score}/${b.total}</span><div class="meter" role="img" aria-label="${p}% de aciertos"><span style="width:${p}%"></span></div></li>`;
        })
        .join("")}</ul>
       <p class="result-note">Referencia: el examen real se aprueba con 750 sobre 1000 en una escala propia de AWS; este porcentaje es orientativo y no equivale a esa escala.</p>`
    : "";
  const sub = isExam ? (activeSpec.size ? "Test corto terminado" : "Examen completo terminado") : activeSpec.limit ? `Quiz rápido · ${r.total} preguntas` : "Quiz completado";

  $("#results-card").innerHTML = `<article class="result" style="--c:${d.color}">
    <h1 tabindex="-1" data-focus>${esc(d.name)}</h1>
    <p class="result-sub">${sub}</p>
    <p class="result-score"><span>${r.score} de ${r.total} correctas</span><span class="result-pct">${pct}%</span></p>
    ${breakdown}
    <ul class="outcomes" aria-label="Resultado por pregunta">
      ${r.outcomes
        .map((ok, i) => `<li class="${ok ? "" : "is-wrong"}" aria-label="Pregunta ${i + 1}: ${ok ? "correcta" : "incorrecta"}">${ok ? ICON_CHECK : ICON_CROSS}</li>`)
        .join("")}
    </ul>
    <p class="result-note">${note}</p>
    <div class="result-actions">
      <button class="btn btn-primary" id="results-retry-btn">Repetir este quiz</button>
      <button class="btn btn-secondary" id="results-back-btn">Elegir otro quiz</button>
    </div>
  </article>`;

  $("#results-retry-btn").addEventListener("click", () => startQuiz(activeSpec));
  $("#results-back-btn").addEventListener("click", () => {
    renderHome();
    showView("home");
  });
  showView("results");
}

// ---------- Vista: progreso ----------

function renderProgress() {
  $("#blueprint-progress").innerHTML = blueprintHTML({ link: false, intro: false });

  const failed = getFailedCount();
  $("#progress-note").textContent = failed
    ? `${plural(failed, "pregunta guardada", "preguntas guardadas")} para repaso.`
    : "No tienes preguntas pendientes de repaso.";

  const attempts = getRecentAttempts(10).filter((a) => DOMAINS.some((d) => d.id === a.domain));
  $("#attempt-list").innerHTML = attempts.length
    ? attempts
        .map((a) => {
          const d = DOMAINS.find((x) => x.id === a.domain);
          const pct = Math.round((a.score / a.total) * 100);
          const date = new Date(a.timestamp);
          const when = isNaN(date)
            ? "Fecha desconocida"
            : date.toLocaleString("es", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
          return `<li class="attempt" style="--c:${d.color}">
            <div class="attempt-main">
              <span class="attempt-domain"><span class="dot"></span>${esc(d.name)}</span>
              <span class="attempt-when">${esc(when)}</span>
            </div>
            <span class="attempt-score">${a.score}/${a.total}</span>
            <div class="meter" role="img" aria-label="${pct}% de aciertos"><span style="width:${pct}%"></span></div>
          </li>`;
        })
        .join("")
    : '<li class="empty">Aún no hay intentos. Completa un quiz y aquí verás cómo avanzas.</li>';
}

// ---------- Inicio ----------

renderHome();
loadQuestionCounts();
syncFromRemote().then((changed) => {
  if (changed) {
    renderHome();
    renderProgress();
  }
});
