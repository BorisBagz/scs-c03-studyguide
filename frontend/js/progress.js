// Persistencia de progreso: localStorage como fuente local + sync best-effort
// con el backend (API Gateway + Lambda + DynamoDB) para tener los mismos
// datos en laptop y teléfono.

const LOCAL_KEY = "scs03_progress_v1";

function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : { attempts: [], failedQuestions: {} };
  } catch (e) {
    console.warn("No se pudo leer progreso local:", e);
    return { attempts: [], failedQuestions: {} };
  }
}

function saveLocalProgress(progress) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn("No se pudo guardar progreso local:", e);
  }
}

function hasRemoteConfig() {
  return (
    typeof CONFIG !== "undefined" &&
    CONFIG.API_BASE_URL &&
    !CONFIG.API_BASE_URL.includes("REPLACE")
  );
}

async function syncAttemptToRemote(attempt) {
  if (!hasRemoteConfig()) return;
  try {
    await fetch(`${CONFIG.API_BASE_URL}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.API_KEY,
      },
      body: JSON.stringify({
        type: "attempt",
        domain: attempt.domain,
        score: attempt.score,
        total: attempt.total,
        timestamp: attempt.timestamp,
      }),
    });
  } catch (e) {
    console.warn("Sync de intento falló (se queda guardado localmente):", e);
  }
}

async function syncFailedQuestionToRemote(domain, questionId) {
  if (!hasRemoteConfig()) return;
  try {
    await fetch(`${CONFIG.API_BASE_URL}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.API_KEY,
      },
      body: JSON.stringify({
        type: "failed_question",
        domain,
        questionId,
      }),
    });
  } catch (e) {
    console.warn("Sync de pregunta fallada falló:", e);
  }
}

async function fetchRemoteProgress() {
  if (!hasRemoteConfig()) return null;
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/progress`, {
      headers: { "x-api-key": CONFIG.API_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.warn("No se pudo obtener progreso remoto:", e);
    return null;
  }
}

function recordAttempt(domain, score, total) {
  const progress = loadLocalProgress();
  const attempt = {
    domain,
    score,
    total,
    timestamp: new Date().toISOString(),
  };
  progress.attempts.push(attempt);
  saveLocalProgress(progress);
  syncAttemptToRemote(attempt);
  return attempt;
}

function recordFailedQuestion(domain, questionId) {
  const progress = loadLocalProgress();
  progress.failedQuestions[questionId] = {
    domain,
    lastSeen: new Date().toISOString(),
  };
  saveLocalProgress(progress);
  syncFailedQuestionToRemote(domain, questionId);
}

function getDomainStats(domainId) {
  const progress = loadLocalProgress();
  const domainAttempts = progress.attempts.filter((a) => a.domain === domainId);
  if (domainAttempts.length === 0) return null;
  const totalScore = domainAttempts.reduce((sum, a) => sum + a.score, 0);
  const totalQuestions = domainAttempts.reduce((sum, a) => sum + a.total, 0);
  const latest = domainAttempts[domainAttempts.length - 1];
  return {
    attempts: domainAttempts.length,
    avgPercent: Math.round((totalScore / totalQuestions) * 100),
    latestPercent: Math.round((latest.score / latest.total) * 100),
  };
}
