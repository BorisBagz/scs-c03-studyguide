// Persistencia de progreso: localStorage como fuente local + sync best-effort
// con el backend (API Gateway + Lambda + DynamoDB) para tener los mismos
// datos en laptop y teléfono.

const LOCAL_KEY = "scs03_progress_v1";

function emptyProgress() {
  return { attempts: [], failedQuestions: {}, topics: {} };
}

function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const progress = raw ? JSON.parse(raw) : emptyProgress();
    // Datos guardados antes de que existiera la teoria no traen "topics"
    progress.attempts ||= [];
    progress.failedQuestions ||= {};
    progress.topics ||= {};
    return progress;
  } catch (e) {
    console.warn("No se pudo leer progreso local:", e);
    return emptyProgress();
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

async function syncTopicToRemote(topicId, done, updatedAt) {
  if (!hasRemoteConfig()) return;
  try {
    await fetch(`${CONFIG.API_BASE_URL}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.API_KEY,
      },
      body: JSON.stringify({ type: "topic", topicId, done, updatedAt }),
    });
  } catch (e) {
    console.warn("Sync de tema fallo (queda guardado localmente):", e);
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

// Mezcla el progreso remoto con el local (union, sin duplicados) y sube al
// backend lo que solo existe localmente (p. ej. intentos hechos offline).
// Devuelve true si el progreso local cambio.
async function syncFromRemote() {
  const items = await fetchRemoteProgress();
  if (items === null) return false;

  const progress = loadLocalProgress();
  const attemptKey = (a) => `${a.domain}|${a.timestamp}`;
  const localKeys = new Set(progress.attempts.map(attemptKey));
  const remoteKeys = new Set();
  const remoteTopics = {};
  let changed = false;

  for (const item of items) {
    if (item.recordType === "attempt") {
      remoteKeys.add(attemptKey(item));
      if (!localKeys.has(attemptKey(item))) {
        progress.attempts.push({
          domain: item.domain,
          score: item.score,
          total: item.total,
          timestamp: item.timestamp,
        });
        changed = true;
      }
    } else if (item.recordType === "topic") {
      remoteTopics[item.topicId] = item.updatedAt;
      const local = progress.topics[item.topicId];
      // gana el cambio mas reciente (marcar y desmarcar son ambos validos)
      if (!local || local.updatedAt < item.updatedAt) {
        progress.topics[item.topicId] = { done: item.done, updatedAt: item.updatedAt };
        changed = true;
      }
    } else if (item.recordType === "failed_question") {
      const local = progress.failedQuestions[item.questionId];
      if (!local || local.lastSeen < item.lastSeen) {
        progress.failedQuestions[item.questionId] = {
          domain: item.domain,
          lastSeen: item.lastSeen,
        };
        changed = true;
      }
    }
  }

  if (changed) {
    progress.attempts.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    saveLocalProgress(progress);
  }

  // El sk del intento incluye el timestamp, asi que re-enviar es idempotente.
  progress.attempts
    .filter((a) => !remoteKeys.has(attemptKey(a)))
    .forEach((a) => syncAttemptToRemote(a));

  // Temas que solo existen localmente o que cambiaron aqui despues del remoto
  Object.entries(progress.topics)
    .filter(([id, t]) => !remoteTopics[id] || remoteTopics[id] < t.updatedAt)
    .forEach(([id, t]) => syncTopicToRemote(id, t.done, t.updatedAt));

  return changed;
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

// Dominio actual = promedio ponderado de los ultimos 3 intentos del dominio.
// (El promedio historico tarda en reflejar mejoras; un solo intento es muy volatil.)
function getDomainMastery(domainId) {
  const attempts = loadLocalProgress()
    .attempts.filter((a) => a.domain === domainId && a.total > 0)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-3);
  if (attempts.length === 0) return null;
  const score = attempts.reduce((s, a) => s + a.score, 0);
  const total = attempts.reduce((s, a) => s + a.total, 0);
  return Math.round((score / total) * 100);
}

function getRecentAttempts(limit = 10) {
  return loadLocalProgress()
    .attempts.slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}

function getFailedCount() {
  return Object.keys(loadLocalProgress().failedQuestions).length;
}

// ---------- Teoria: temas estudiados ----------

function isTopicDone(topicId) {
  return Boolean(loadLocalProgress().topics[topicId]?.done);
}

function setTopicDone(topicId, done) {
  const progress = loadLocalProgress();
  const updatedAt = new Date().toISOString();
  progress.topics[topicId] = { done, updatedAt };
  saveLocalProgress(progress);
  syncTopicToRemote(topicId, done, updatedAt);
}

// Cuantos temas de un dominio estan marcados como estudiados
function countTopicsDone(domainId) {
  const topics = loadLocalProgress().topics;
  return Object.entries(topics).filter(([id, t]) => t.done && id.startsWith(`${domainId}/`)).length;
}
