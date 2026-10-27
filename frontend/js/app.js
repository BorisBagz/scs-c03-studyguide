// Interfaz: vistas (dominios / quiz / resultado / progreso) y su render.

const $ = (sel) => document.querySelector(sel);

const views = {
  home: $("#view-home"),
  quiz: $("#view-quiz"),
  results: $("#view-results"),
  progress: $("#view-progress"),
};

const questionCounts = {}; // domainId -> numero | null (error) | undefined (cargando)
let activeDomain = null;
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
  const tab = name === "progress" ? "progress" : "home";
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
    if (btn.dataset.view === "progress") {
      renderProgress();
      showView("progress");
      syncFromRemote().then((changed) => changed && renderProgress());
    } else {
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
    ${count === 0 ? "" : `<button class="btn btn-primary" data-domain="${d.id}" ${enabled ? "" : "disabled"}>Practicar</button>`}
  </li>`;
}

function renderRows() {
  $("#domain-list").innerHTML = DOMAINS.map(rowHTML).join("");
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
  startQuiz(DOMAINS.find((d) => d.id === btn.dataset.domain));
});

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
}

// ---------- Vista: quiz ----------

async function startQuiz(domain) {
  try {
    const count = await QuizEngine.loadDomain(domain);
    if (count === 0) {
      notice(`Aún no hay preguntas de ${domain.name}.`);
      return;
    }
    activeDomain = domain;
    views.quiz.style.setProperty("--c", domain.color);
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

function renderQuestion() {
  const q = QuizEngine.getCurrentQuestion();
  const multi = q.type === "multiple" || q.correct.length > 1;
  const kind = multi ? "Elige todas las que apliquen" : q.type === "scenario" ? "Escenario: elige una respuesta" : "";

  $("#quiz-progress-label").textContent = `${QuizEngine.getCurrentIndex() + 1} de ${QuizEngine.getTotal()}`;
  renderSteps();

  $("#quiz-question-card").innerHTML = `<article class="q">
    ${kind ? `<p class="q-kind">${kind}</p>` : ""}
    <h2 class="q-text" id="q-text" tabindex="-1">${fmt(q.question)}</h2>
    <fieldset class="opts" aria-labelledby="q-text">
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
    </fieldset>
    <div id="quiz-feedback" class="feedback hidden" role="status" aria-live="polite"></div>
  </article>`;

  const submit = $("#quiz-submit-btn");
  submit.disabled = true;
  submit.classList.remove("hidden");
  $("#quiz-next-btn").classList.add("hidden");
  window.scrollTo(0, 0);
  $("#q-text").focus({ preventScroll: true });
}

$("#quiz-question-card").addEventListener("change", (e) => {
  if (e.target.name === "quiz-option") {
    $("#quiz-submit-btn").disabled = false;
  }
});

$("#quiz-submit-btn").addEventListener("click", () => {
  const selected = Array.from(document.querySelectorAll('input[name="quiz-option"]:checked')).map((el) => el.value);
  if (selected.length === 0) return;
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
  const correct = new Set(q.correct);

  document.querySelector(".q").classList.add("is-revealed");
  document.querySelectorAll(".opt").forEach((label) => {
    const id = label.dataset.id;
    const mark = label.querySelector(".opt-mark");
    label.querySelector("input").disabled = true;
    if (correct.has(id)) {
      label.classList.add("is-correct");
      mark.innerHTML = `${ICON_CHECK}<span class="sr-only">Respuesta correcta</span>`;
    } else if (selected.includes(id)) {
      label.classList.add("is-wrong");
      mark.innerHTML = `${ICON_CROSS}<span class="sr-only">Respuesta incorrecta</span>`;
    }
  });

  const letters = q.correct.map((id) => id.toUpperCase());
  const answerLine = ok
    ? ""
    : `<p class="feedback-answer">${letters.length > 1 ? "Las respuestas correctas son" : "La respuesta correcta es"} ${joinList(letters)}.</p>`;
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
  recordAttempt(r.domain, r.score, r.total);
  r.failedIds.forEach((id) => recordFailedQuestion(r.domain, id));

  const d = activeDomain;
  const pct = Math.round((r.score / r.total) * 100);
  const note = r.failedIds.length
    ? `${plural(r.failedIds.length, "pregunta guardada", "preguntas guardadas")} para repaso.`
    : "Acertaste todas.";

  $("#results-card").innerHTML = `<article class="result" style="--c:${d.color}">
    <h1 tabindex="-1" data-focus>${esc(d.name)}</h1>
    <p class="result-sub">Quiz completado</p>
    <p class="result-score"><span>${r.score} de ${r.total} correctas</span><span class="result-pct">${pct}%</span></p>
    <ul class="outcomes" aria-label="Resultado por pregunta">
      ${r.outcomes
        .map((ok, i) => `<li class="${ok ? "" : "is-wrong"}" aria-label="Pregunta ${i + 1}: ${ok ? "correcta" : "incorrecta"}">${ok ? ICON_CHECK : ICON_CROSS}</li>`)
        .join("")}
    </ul>
    <p class="result-note">${note}</p>
    <div class="result-actions">
      <button class="btn btn-primary" id="results-retry-btn">Repetir este quiz</button>
      <button class="btn btn-secondary" id="results-back-btn">Elegir otro dominio</button>
    </div>
  </article>`;

  $("#results-retry-btn").addEventListener("click", () => startQuiz(activeDomain));
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
