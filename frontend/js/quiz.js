// Motor de quizzes: carga preguntas de un dominio, renderiza, califica.

const QuizEngine = (() => {
  let currentQuestions = [];
  let currentDomain = null;
  let currentIndex = 0;
  let userAnswers = [];

  async function loadDomain(domain) {
    // no-cache: revalida contra el servidor (ETag) para ver preguntas nuevas al publicar
    const res = await fetch(`data/questions/${domain.file}`, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error(`No se pudo cargar ${domain.file} (HTTP ${res.status})`);
    }
    const data = await res.json();
    currentQuestions = shuffle(data.questions);
    currentDomain = domain;
    currentIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    return currentQuestions.length;
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getCurrentQuestion() {
    return currentQuestions[currentIndex];
  }

  function getCurrentIndex() {
    return currentIndex;
  }

  function getTotal() {
    return currentQuestions.length;
  }

  // true/false por pregunta respondida, null si aun no se responde
  function getOutcomes() {
    return currentQuestions.map((_, i) => (userAnswers[i] === null ? null : isCorrect(i)));
  }

  function getProgressLabel() {
    return `Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  }

  function submitAnswer(selectedIds) {
    userAnswers[currentIndex] = selectedIds;
  }

  function isCorrect(index = currentIndex) {
    const q = currentQuestions[index];
    const given = userAnswers[index] || [];
    const correct = [...q.correct].sort();
    const givenSorted = [...given].sort();
    return (
      correct.length === givenSorted.length &&
      correct.every((v, i) => v === givenSorted[i])
    );
  }

  function next() {
    if (currentIndex < currentQuestions.length - 1) {
      currentIndex++;
      return true;
    }
    return false;
  }

  function hasNext() {
    return currentIndex < currentQuestions.length - 1;
  }

  function computeResults() {
    let correctCount = 0;
    const failedIds = [];
    const outcomes = [];
    currentQuestions.forEach((q, i) => {
      const ok = isCorrect(i);
      outcomes.push(ok);
      if (ok) {
        correctCount++;
      } else {
        failedIds.push(q.id);
      }
    });
    return {
      domain: currentDomain.id,
      score: correctCount,
      total: currentQuestions.length,
      failedIds,
      outcomes,
    };
  }

  return {
    loadDomain,
    getCurrentQuestion,
    getCurrentIndex,
    getTotal,
    getOutcomes,
    getProgressLabel,
    submitAnswer,
    isCorrect,
    next,
    hasNext,
    computeResults,
  };
})();
