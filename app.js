// app.js
const API_BASE = "https://boardgamegeek.com/xmlapi2/search"; // BGG XML API2 search [1](https://boardgamegeek.com/wiki/page/BGG_XML_API2)

const $ = (sel) => document.querySelector(sel);
const resultsEl = $("#results");
const statusEl = $("#status");
const pagerEl = $("#pager");
const prevBtn = $("#prevPage");
const nextBtn = $("#nextPage");
const pageInfo = $("#pageInfo");

let currentItems = [];
let currentPage = 1;
const pageSize = 20;

// --- Utilidades ---
function encodeQuery(q) {
  return q.trim().replace(/\s+/g, "+");
}

function showStatus(msg) {
  statusEl.textContent = msg || "";
}

function buildUrl({ query, type, exact }) {
  const params = new URLSearchParams();
  params.set("query", encodeQuery(query));
  if (type) params.set("type", type);
  if (exact) params.set("exact", "1");
  return `${API_BASE}?${params.toString()}`;
}

// Parsear XML a objetos JS mínimos
function parseSearchXML(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  const items = Array.from(xml.getElementsByTagName("item")).map((item) => {
    const id = item.getAttribute("id");
    const type = item.getAttribute("type"); // boardgame, boardgameexpansion, etc. [1](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
    const nameEl = item.querySelector('name[type="primary"]') || item.querySelector("name");
    const yearEl = item.querySelector("yearpublished");
    return {
      id,
      type,
      name: nameEl ? nameEl.getAttribute("value") : "(Sin nombre)",
      year: yearEl ? yearEl.getAttribute("value") : null,
      bggUrl: `https://boardgamegeek.com/${type}/${id}`,
    };
  });
  return items;
}

function renderPage(page) {
  currentPage = page;
  const start = (page - 1) * pageSize;
  const slice = currentItems.slice(start, start + pageSize);

  resultsEl.innerHTML = slice
    .map(
      (it) => `
      <article class="result">
        <h3>${escapeHtml(it.name)}</h3>
        <div class="badges">
          <span class="badge">${it.type}</span>
          ${it.year ? `<span class="badge gray">${it.year}</span>` : ""}
          <span class="badge gray">ID: ${it.id}</span>
        </div>
        <p>
          <a href="${it.bggUrl}" target="_blank" rel="noopener">Ver en BGG</a>
        </p>
      </article>`
    )
    .join("");

  // paginador
  const totalPages = Math.max(1, Math.ceil(currentItems.length / pageSize));
  pagerEl.classList.toggle("hidden", totalPages <= 1);
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
  pageInfo.textContent = `Página ${page} de ${totalPages}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

// --- Eventos ---
$("#searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("#query").value;
  const type = $("#type").value;
  const exact = $("#exact").checked;

  if (!query.trim()) {
    showStatus("Introduce un término de búsqueda.");
    return;
  }

  const url = buildUrl({ query, type, exact });

  showStatus("Buscando en BGG…");
  resultsEl.innerHTML = "";
  pagerEl.classList.add("hidden");

  try {
    // Nota: BGG devuelve XML (text), no JSON. [1](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
    const res = await fetch(url);
    const xmlText = await res.text();

    currentItems = parseSearchXML(xmlText);
    if (currentItems.length === 0) {
      showStatus("Sin resultados.");
      return;
    }
    showStatus(`Resultados: ${currentItems.length}`);
    renderPage(1);
  } catch (err) {
    console.error(err);
    showStatus("Error al consultar la API de BGG.");
  }
});

// limpiar
$("#clearBtn").addEventListener("click", () => {
  $("#query").value = "";
  $("#type").value = "";
  $("#exact").checked = false;
  resultsEl.innerHTML = "";
  pagerEl.classList.add("hidden");
  showStatus("");
});

// paginación
prevBtn.addEventListener("click", () => renderPage(currentPage - 1));
nextBtn.addEventListener("click", () => renderPage(currentPage + 1));

// Sugerencia: si vas a encadenar varias peticiones,
// respeta ~5 s entre llamadas para evitar throttling de BGG. [1](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
