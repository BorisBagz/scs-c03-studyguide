// Motor de quizzes: carga preguntas de un dominio, renderiza, califica.

const QuizEngine = (() => {
  let currentQuestions = [];
  let currentDomain = null;
  let currentIndex = 0;
  let userAnswers = [];

  const EXAM_SIZE = 65;
  const SHORT_SIZE = 25;
  const QUICK_SIZE = 15;

  async function fetchDomain(d) {
    // no-cache: revalida contra el servidor (ETag) para ver preguntas nuevas al publicar
    const res = await fetch(`data/questions/${d.file}`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`No se pudo cargar ${d.file} (HTTP ${res.status})`);
    const data = await res.json();
    return data.questions.map((q) => ({ ...q, _domain: d.id }));
  }

  // Reparte `total` preguntas segun el peso de cada dominio (resto mayor),
  // sin exceder las disponibles; el sobrante se reasigna a dominios con banco libre.
  function allocate(total, pools) {
    const sumW = pools.reduce((s, p) => s + p.weight, 0);
    const alloc = pools.map((p) => {
      const exact = (p.weight / sumW) * total;
      return { id: p.id, n: Math.min(Math.floor(exact), p.avail), frac: exact - Math.floor(exact), avail: p.avail, weight: p.weight };
    });
    let left = Math.min(total, pools.reduce((s, p) => s + p.avail, 0)) - alloc.reduce((s, a) => s + a.n, 0);
    const order = [...alloc].sort((x, y) => y.frac - x.frac);
    while (left > 0) {
      const next = order.find((a) => a.n < a.avail) || null;
      if (!next) break;
      next.n++;
      left--;
      order.sort((x, y) => (y.avail - y.n > 0) - (x.avail - x.n > 0) || y.frac - x.frac);
    }
    return Object.fromEntries(alloc.map((a) => [a.id, a.n]));
  }

  // Selección ponderada para examen/simulacro: `size` preguntas repartidas según el peso de cada dominio.
  async function pickExam(size) {
    const pools = await Promise.all(DOMAINS.map(async (d) => ({ d, qs: await fetchDomain(d) })));
    const counts = allocate(size, pools.map((p) => ({ id: p.d.id, weight: p.d.weight, avail: p.qs.length })));
    return shuffle(pools.flatMap((p) => shuffle(p.qs).slice(0, counts[p.d.id])));
  }

  // Todas las preguntas indexadas por id (para retomar un simulacro guardado).
  async function fetchAll() {
    const lists = await Promise.all(DOMAINS.map(fetchDomain));
    return Object.fromEntries(lists.flat().map((q) => [q.id, q]));
  }

  // Califica una respuesta: todo o nada, igual que el examen real.
  function grade(q, given) {
    if (given === null || given === undefined) return false;
    if (q.type === "ordering") {
      // respuesta = ids en el orden elegido; debe coincidir exactamente con q.correct
      return Array.isArray(given) && given.length === q.correct.length && q.correct.every((v, i) => v === given[i]);
    }
    if (q.type === "matching") {
      // respuesta = { idPrompt: idRespuesta }; deben acertarse todos los pares
      return q.prompts.every((p) => given[p.id] === q.correct[p.id]);
    }
    if (!Array.isArray(given)) return false;
    const correct = [...q.correct].sort();
    const givenSorted = [...given].sort();
    return correct.length === givenSorted.length && correct.every((v, i) => v === givenSorted[i]);
  }

  // spec: { kind: "exam" } | { kind: "domain", domain, limit? }
  async function load(spec) {
    let list;
    if (spec.kind === "exam") {
      const pools = await Promise.all(DOMAINS.map(async (d) => ({ d, qs: await fetchDomain(d) })));
      const counts = allocate(spec.size || EXAM_SIZE, pools.map((p) => ({ id: p.d.id, weight: p.d.weight, avail: p.qs.length })));
      list = pools.flatMap((p) => shuffle(p.qs).slice(0, counts[p.d.id]));
      currentDomain = { id: "exam", name: spec.size ? "Test corto" : "Examen completo" };
    } else {
      list = await fetchDomain(spec.domain);
      if (spec.limit) list = shuffle(list).slice(0, spec.limit);
      currentDomain = spec.domain;
    }
    currentQuestions = shuffle(list);
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
    return grade(currentQuestions[index], userAnswers[index]);
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
    const failed = [];
    const outcomes = [];
    const byDomain = {};
    currentQuestions.forEach((q, i) => {
      const ok = isCorrect(i);
      outcomes.push(ok);
      const bd = (byDomain[q._domain] = byDomain[q._domain] || { score: 0, total: 0 });
      bd.total++;
      if (ok) {
        correctCount++;
        bd.score++;
      } else {
        failed.push({ id: q.id, domain: q._domain });
      }
    });
    return {
      domain: currentDomain.id,
      score: correctCount,
      total: currentQuestions.length,
      failed,
      failedIds: failed.map((f) => f.id),
      byDomain,
      outcomes,
    };
  }

  return {
    load,
    pickExam,
    fetchAll,
    grade,
    shuffle,
    EXAM_SIZE,
    SHORT_SIZE,
    QUICK_SIZE,
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
