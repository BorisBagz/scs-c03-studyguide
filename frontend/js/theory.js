// Teoria: indice de dominios -> temas de un dominio -> lectura de un tema (Markdown).
// Rutas (hash): #/teoria · #/teoria/<dominio> · #/teoria/<dominio>/<tema>
// Depende de helpers de app.js (showView, $, esc, plural), que se resuelven al llamar.

const Theory = (() => {
  const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  let indexPromise = null;
  const markdownCache = {};

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch("data/theory/index.json", { cache: "no-cache" })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .catch((e) => {
          indexPromise = null; // permite reintentar
          throw e;
        });
    }
    return indexPromise;
  }

  async function loadMarkdown(domainId, topicId) {
    const key = `${domainId}/${topicId}`;
    if (!markdownCache[key]) {
      const res = await fetch(`data/theory/${key}.md`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      markdownCache[key] = await res.text();
    }
    return markdownCache[key];
  }

  function slug(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  // Markdown -> DOM seguro para mostrar: ids en h2, tablas con scroll, enlaces externos.
  function renderMarkdown(md) {
    const doc = document.createElement("div");
    doc.innerHTML = marked.parse(md, { gfm: true });

    const toc = [];
    doc.querySelectorAll("h2").forEach((h, i) => {
      const id = `s-${i + 1}-${slug(h.textContent)}`;
      h.id = id;
      toc.push({ id, text: h.textContent });
    });
    doc.querySelectorAll("table").forEach((table) => {
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.replaceWith(wrap);
      wrap.appendChild(table);
    });
    doc.querySelectorAll("a[href]").forEach((a) => {
      if (/^https:\/\//.test(a.getAttribute("href"))) {
        a.target = "_blank";
        a.rel = "noopener";
      } else {
        a.removeAttribute("href"); // nada de javascript: ni rutas raras
      }
    });
    const words = doc.textContent.trim().split(/\s+/).length;
    return { html: doc.innerHTML, toc, minutes: Math.max(1, Math.round(words / 200)) };
  }

  function crumbs(parts) {
    return `<nav class="crumbs" aria-label="Ruta">${parts
      .map((p, i) => (p.href ? `<a href="${p.href}">${esc(p.label)}</a>` : `<span aria-current="page">${esc(p.label)}</span>`) + (i < parts.length - 1 ? '<span aria-hidden="true">/</span>' : ""))
      .join("")}</nav>`;
  }

  function loadError(message) {
    return `<p class="empty">${esc(message)} <a href="#/teoria">Volver a Teoría</a></p>`;
  }

  // ---------- Indice de dominios ----------

  async function showIndex() {
    showView("theory");
    const host = $("#theory-list");
    host.innerHTML = '<li class="empty">Cargando…</li>';
    try {
      const idx = await loadIndex();
      host.innerHTML = DOMAINS.map((d) => {
        const n = (idx.domains[d.id]?.topics || []).length;
        const done = n ? countTopicsDone(d.id) : 0;
        const pct = n ? Math.round((done / n) * 100) : 0;
        return `<li class="row" style="--c:${d.color};--t:${d.tint}">
          <div>
            <h2 class="row-name">${esc(d.name)}</h2>
            <p class="row-sub">${n ? plural(n, "tema", "temas") : "Contenido en preparación"}</p>
          </div>
          <div class="row-weight"><span class="fig">${d.weight}%</span><span class="cap">del examen</span></div>
          <div class="row-mastery">${
            n
              ? `<div class="meter" role="img" aria-label="${pct}% estudiado"><span style="width:${pct}%"></span></div>
                 <span class="cap">${done} de ${n} estudiados</span>`
              : ""
          }</div>
          ${n ? `<a class="btn btn-primary" href="#/teoria/${d.id}">${done ? "Continuar" : "Estudiar"}</a>` : ""}
        </li>`;
      }).join("");
    } catch (e) {
      host.innerHTML = `<li class="empty">No se pudo cargar la teoría (${esc(e.message)}). Revisa tu conexión e intenta de nuevo.</li>`;
    }
  }

  // ---------- Temas de un dominio ----------

  async function showDomain(domainId) {
    const d = DOMAINS.find((x) => x.id === domainId);
    if (!d) return showNotFound();
    showView("domain");
    const host = $("#domain-body");
    host.innerHTML = '<p class="empty">Cargando…</p>';
    try {
      const idx = await loadIndex();
      const info = idx.domains[d.id] || { tasks: [], topics: [] };
      if (!info.topics.length) {
        host.innerHTML = loadError("Este dominio aún no tiene contenido.");
        return;
      }
      const done = countTopicsDone(d.id);
      host.style.setProperty("--c", d.color);
      host.innerHTML = `
        ${crumbs([{ label: "Teoría", href: "#/teoria" }, { label: d.name }])}
        <header class="view-head">
          <h1 tabindex="-1" data-focus>${esc(d.name)}</h1>
          <p class="lede">${d.weight}% del examen. ${done} de ${info.topics.length} temas estudiados.</p>
        </header>
        ${groupTopics(d, info)}`;
      host.querySelector("[data-focus]").focus({ preventScroll: true });
    } catch (e) {
      host.innerHTML = loadError(`No se pudo cargar el dominio (${e.message}).`);
    }
  }

  function groupTopics(d, info) {
    const taskById = Object.fromEntries(info.tasks.map((t) => [t.id, t]));
    const groups = new Map();
    info.tasks.forEach((t) => groups.set(t.id, []));
    info.topics.forEach((topic) => {
      const key = topic.tasks && taskById[topic.tasks[0]] ? topic.tasks[0] : "_general";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(topic);
    });

    return [...groups.entries()]
      .filter(([, topics]) => topics.length)
      .map(([key, topics]) => {
        const task = taskById[key];
        const title = task
          ? `<span class="task-id">Tarea ${esc(task.id)}</span>${esc(task.title)}`
          : "Para empezar";
        const items = topics
          .map((t) => {
            const done = isTopicDone(`${d.id}/${t.id}`);
            const services = (t.services || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("");
            return `<li class="topic${done ? " is-done" : ""}">
              <a class="topic-link" href="#/teoria/${d.id}/${t.id}">
                <span class="topic-check" aria-hidden="true">${done ? CHECK : ""}</span>
                <span class="topic-body">
                  <span class="topic-title">${esc(t.title)}${done ? '<span class="sr-only"> (estudiado)</span>' : ""}</span>
                  <span class="topic-sum">${esc(t.summary)}</span>
                  ${services ? `<span class="chips">${services}</span>` : ""}
                </span>
                <span class="topic-go" aria-hidden="true">${CHEVRON}</span>
              </a>
            </li>`;
          })
          .join("");
        return `<section class="task-group"><h2 class="task-title">${title}</h2><ul class="topics">${items}</ul></section>`;
      })
      .join("");
  }

  // ---------- Lectura de un tema ----------

  async function showTopic(domainId, topicId) {
    const d = DOMAINS.find((x) => x.id === domainId);
    if (!d) return showNotFound();
    showView("topic");
    const host = $("#topic-body");
    host.innerHTML = '<p class="empty">Cargando…</p>';
    try {
      const idx = await loadIndex();
      const topics = idx.domains[d.id]?.topics || [];
      const pos = topics.findIndex((t) => t.id === topicId);
      if (pos < 0) return showNotFound();
      const topic = topics[pos];
      const tasks = idx.domains[d.id].tasks || [];
      const taskLabels = (topic.tasks || [])
        .map((id) => tasks.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => `Tarea ${t.id}`);

      const { html, toc, minutes } = renderMarkdown(await loadMarkdown(d.id, topic.id));
      const key = `${d.id}/${topic.id}`;
      const prev = topics[pos - 1];
      const next = topics[pos + 1];

      host.style.setProperty("--c", d.color);
      host.innerHTML = `
        ${crumbs([{ label: "Teoría", href: "#/teoria" }, { label: d.name, href: `#/teoria/${d.id}` }, { label: topic.title }])}
        <header class="doc-head">
          <h1 tabindex="-1" data-focus>${esc(topic.title)}</h1>
          <p class="lede">${esc(topic.summary)}</p>
          <p class="doc-meta">${taskLabels.map((l) => `<span>${esc(l)}</span>`).join("")}<span>${minutes} min de lectura</span></p>
        </header>
        <div class="doc-layout">
          <div class="prose">${html}</div>
          ${
            toc.length > 1
              ? `<aside class="toc" aria-label="En esta página">
                  <p class="toc-title">En esta página</p>
                  <ul>${toc.map((s) => `<li><a href="#/teoria/${key}" data-target="${s.id}">${esc(s.text)}</a></li>`).join("")}</ul>
                </aside>`
              : ""
          }
        </div>
        <footer class="doc-end">
          <button id="topic-done-btn" class="btn" aria-pressed="false"></button>
          <nav class="pager" aria-label="Temas del dominio">
            ${prev ? `<a class="pager-link" href="#/teoria/${d.id}/${prev.id}"><span class="cap">Anterior</span>${esc(prev.title)}</a>` : "<span></span>"}
            ${next ? `<a class="pager-link is-next" href="#/teoria/${d.id}/${next.id}"><span class="cap">Siguiente</span>${esc(next.title)}</a>` : "<span></span>"}
          </nav>
        </footer>`;

      bindDoneButton(key);
      host.querySelectorAll(".toc a[data-target]").forEach((a) =>
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const target = document.getElementById(a.dataset.target);
          if (target) target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        })
      );
      host.querySelector("[data-focus]").focus({ preventScroll: true });
    } catch (e) {
      host.innerHTML = loadError(`No se pudo cargar el tema (${e.message}).`);
    }
  }

  function bindDoneButton(key) {
    const btn = $("#topic-done-btn");
    const paint = () => {
      const done = isTopicDone(key);
      btn.setAttribute("aria-pressed", String(done));
      btn.className = `btn ${done ? "btn-secondary is-done" : "btn-primary"}`;
      btn.innerHTML = done ? `${CHECK}<span>Estudiado</span>` : "Marcar como estudiado";
    };
    btn.addEventListener("click", () => {
      setTopicDone(key, !isTopicDone(key));
      paint();
    });
    paint();
  }

  function showNotFound() {
    showView("theory");
    $("#theory-list").innerHTML = '<li class="empty">No encontramos esa página. Elige un dominio de la lista.</li>';
    return Promise.resolve();
  }

  // ---------- Router ----------

  const ROUTE = /^#\/teoria(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?\/?$/;

  // Devuelve true si el hash corresponde a Teoria (y la muestra)
  function route() {
    const m = location.hash.match(ROUTE);
    if (!m) return false;
    const [, domainId, topicId] = m;
    if (!domainId) showIndex();
    else if (!topicId) showDomain(domainId);
    else showTopic(domainId, topicId);
    return true;
  }

  window.addEventListener("hashchange", () => {
    if (route()) return;
    // Atras desde Teoria hacia una URL sin hash: volver a Practica
    if (["theory", "domain", "topic"].some((v) => !views[v].classList.contains("hidden"))) {
      renderHome();
      showView("home");
    }
  });

  return { route, loadIndex };
})();

// Entrada directa a una URL de Teoria (p. ej. recargar o abrir un enlace)
Theory.route();
