// Router simple entre vistas (home / quiz / results / progress).

const views = {
  home: document.getElementById("view-home"),
  quiz: document.getElementById("view-quiz"),
  results: document.getElementById("view-results"),
  progress: document.getElementById("view-progress"),
};

function showView(name) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.view === name);
  });
}

document.querySelectorAll(".nav-btn[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    if (view === "progress") {
      renderProgressView();
      syncFromRemote().then((changed) => changed && renderProgressView());
    }
    showView(view);
  });
});

function renderDomainList() {
  const container = document.getElementById("domain-list");
  container.innerHTML = "";
  DOMAINS.forEach((domain) => {
    const stats = getDomainStats(domain.id);
    const card = document.createElement("div");
    card.className = "domain-card";
    card.innerHTML = `
      <h3>${domain.name}</h3>
      <p class="domain-weight">${domain.weight}% del examen</p>
      <p class="domain-stats">${
        stats
          ? `${stats.attempts} intento(s) · último: ${stats.latestPercent}%`
          : "Sin intentos aún"
      }</p>
      <button class="btn-primary start-quiz-btn">Practicar</button>
    `;
    card.querySelector(".start-quiz-btn").addEventListener("click", () => {
      startQuiz(domain);
    });
    container.appendChild(card);
  });
}

async function startQuiz(domain) {
  try {
    const count = await QuizEngine.loadDomain(domain);
    if (count === 0) {
      alert(`Aún no hay preguntas cargadas para ${domain.name}.`);
      return;
    }
    document.getElementById("quiz-next-btn").classList.add("hidden");
    document.getElementById("quiz-submit-btn").classList.remove("hidden");
    renderCurrentQuestion();
    showView("quiz");
  } catch (e) {
    alert(`Error cargando preguntas: ${e.message}`);
  }
}

function renderCurrentQuestion() {
  const q = QuizEngine.getCurrentQuestion();
  document.getElementById("quiz-progress-label").textContent = QuizEngine.getProgressLabel();

  const inputType = q.type === "multiple" ? "checkbox" : "radio";
  const optionsHtml = q.options
    .map(
      (opt) => `
      <label class="quiz-option">
        <input type="${inputType}" name="quiz-option" value="${opt.id}" />
        <span>${opt.text}</span>
      </label>`
    )
    .join("");

  document.getElementById("quiz-question-card").innerHTML = `
    <p class="quiz-type-badge">${labelForType(q.type)}</p>
    <p class="quiz-question-text">${q.question}</p>
    <div class="quiz-options">${optionsHtml}</div>
    <div id="quiz-feedback" class="quiz-feedback hidden"></div>
  `;

  document.getElementById("quiz-submit-btn").classList.remove("hidden");
  document.getElementById("quiz-next-btn").classList.add("hidden");
}

function labelForType(type) {
  if (type === "multiple") return "Opción múltiple (varias respuestas)";
  if (type === "scenario") return "Escenario";
  return "Opción única";
}

document.getElementById("quiz-submit-btn").addEventListener("click", () => {
  const selected = Array.from(
    document.querySelectorAll('input[name="quiz-option"]:checked')
  ).map((el) => el.value);

  if (selected.length === 0) {
    alert("Selecciona al menos una opción.");
    return;
  }

  QuizEngine.submitAnswer(selected);
  showFeedback();
  document.getElementById("quiz-submit-btn").classList.add("hidden");
  document.getElementById("quiz-next-btn").classList.remove("hidden");
});

function showFeedback() {
  const q = QuizEngine.getCurrentQuestion();
  const correct = QuizEngine.isCorrect();
  const feedbackEl = document.getElementById("quiz-feedback");
  feedbackEl.classList.remove("hidden");
  feedbackEl.className = `quiz-feedback ${correct ? "feedback-correct" : "feedback-incorrect"}`;
  feedbackEl.innerHTML = `
    <p><strong>${correct ? "Correcto" : "Incorrecto"}</strong></p>
    <p>${q.explanation}</p>
    ${q.reference ? `<p class="quiz-reference"><a href="${q.reference}" target="_blank" rel="noopener">Referencia AWS</a></p>` : ""}
  `;

  document.querySelectorAll('input[name="quiz-option"]').forEach((input) => {
    input.disabled = true;
  });
}

document.getElementById("quiz-next-btn").addEventListener("click", () => {
  const hadNext = QuizEngine.hasNext();
  if (hadNext) {
    QuizEngine.next();
    renderCurrentQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  const results = QuizEngine.computeResults();
  recordAttempt(results.domain, results.score, results.total);
  results.failedIds.forEach((id) => recordFailedQuestion(results.domain, id));

  const domain = DOMAINS.find((d) => d.id === results.domain);
  const percent = Math.round((results.score / results.total) * 100);

  document.getElementById("results-card").innerHTML = `
    <h2>Resultado: ${domain.name}</h2>
    <p class="results-score">${results.score} / ${results.total} (${percent}%)</p>
    <p>${results.failedIds.length} pregunta(s) marcada(s) para repaso.</p>
  `;
  showView("results");
}

document.getElementById("results-back-btn").addEventListener("click", () => {
  renderDomainList();
  showView("home");
});

document.getElementById("quiz-exit-btn").addEventListener("click", () => {
  if (confirm("¿Salir del quiz sin terminar? No se guardará el intento.")) {
    renderDomainList();
    showView("home");
  }
});

function renderProgressView() {
  const container = document.getElementById("progress-list");
  container.innerHTML = "";
  DOMAINS.forEach((domain) => {
    const stats = getDomainStats(domain.id);
    const row = document.createElement("div");
    row.className = "progress-row";
    row.innerHTML = `
      <span class="progress-domain-name">${domain.name}</span>
      <span class="progress-domain-value">${
        stats ? `${stats.avgPercent}% promedio (${stats.attempts} intentos)` : "Sin datos"
      }</span>
    `;
    container.appendChild(row);
  });
}

// Init: render inmediato con datos locales, luego mezcla con el backend
renderDomainList();
syncFromRemote().then((changed) => {
  if (changed) {
    renderDomainList();
    renderProgressView();
  }
});
