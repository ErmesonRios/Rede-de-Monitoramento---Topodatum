const COORDINATES = [
  {
    radius: "AR01",
    east: "375149.194",
    sigmaX: "0.001",
    north: "9202663.837",
    sigmaY: "0.002",
    height: "596.15",
    SigmaZ: "0.002",
    municipality: "Araripe",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "MC01",
    east: "372299.794",
    sigmaX: "0.001",
    north: "9655814.194",
    sigmaY: "0.002",
    height: "17.81",
    SigmaZ: "0.003",
    municipality: "Marco",
    location: "Sede Topodatum",
    antennaHeight: "8.65m",
  },
  {
    radius: "CA01",
    east: "582305.905",
    sigmaX: "0.001",
    north: "9542727.665",
    sigmaY: "0.004",
    height: "37.28",
    SigmaZ: "0.005",
    municipality: "Cascavel",
    location: "Sede de Cascavel",
    antennaHeight: "1.75m",
  },
  {
    radius: "JN01",
    east: "466842.442",
    sigmaX: "0.001",
    north: "9199233.036",
    sigmaY: "0.002",
    height: "440.32",
    SigmaZ: "0.003",
    municipality: "Juazeiro do Norte",
    location: "Parque de Vaquejada",
    antennaHeight: "1.75m",
  },
  {
    radius: "PO01",
    east: "487024.502",
    sigmaX: "0.007",
    north: "9167365.980",
    sigmaY: "0.002",
    height: "502.40",
    SigmaZ: "0.008",
    municipality: "Porteiras",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "PO02",
    east: "486986.107",
    sigmaX: "0.000",
    north: "9167457.756",
    sigmaY: "0.001",
    height: "505.51",
    SigmaZ: "0.002",
    municipality: "Porteiras",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "MV01",
    east: "484610.226",
    sigmaX: "0.001",
    north: "9198290.741",
    sigmaY: "0.001",
    height: "365.47",
    SigmaZ: "0.003",
    municipality: "Missão Velha",
    location: "Centro",
    antennaHeight: "1.75m",
  },
  {
    radius: "CT01",
    east: "402487.016",
    sigmaX: "0.005",
    north: "9321888.794",
    sigmaY: "0.013",
    height: "593.72",
    SigmaZ: "0.031",
    municipality: "Catarina",
    location: "Centro",
    antennaHeight: "1.75m",
  },
];

// =============================================================================
// CONVERSÃO UTM (Zona 24S / SIRGAS 2000) → WGS-84
// Usado automaticamente para plotar cada base no mapa.
// =============================================================================
const utmToLatLng = (east, north) => {
  const k0 = 0.9996, a = 6378137.0, es = 0.00669438;
  const e1 = (1 - Math.sqrt(1 - es)) / (1 + Math.sqrt(1 - es));
  const x  = east - 500000;
  const y  = north - 10000000;
  const lon0 = (24 * 6 - 183) * (Math.PI / 180);
  const ep2 = es / (1 - es);
  const mu  = (y / k0) / (a * (1 - es/4 - 3*es**2/64 - 5*es**3/256));
  const p1  = mu
    + (3*e1/2    - 27*e1**3/32)  * Math.sin(2*mu)
    + (21*e1**2/16 - 55*e1**4/32) * Math.sin(4*mu)
    + (151*e1**3/96)              * Math.sin(6*mu);
  const N1 = a / Math.sqrt(1 - es * Math.sin(p1)**2);
  const T1 = Math.tan(p1)**2;
  const C1 = ep2 * Math.cos(p1)**2;
  const R1 = a * (1 - es) / (1 - es * Math.sin(p1)**2)**1.5;
  const D  = x / (N1 * k0);
  const lat = p1
    - (N1 * Math.tan(p1) / R1)
      * (D**2/2
        - (5 + 3*T1 + 10*C1 - 4*C1**2 - 9*ep2) * D**4/24
        + (61 + 90*T1 + 298*C1 + 45*T1**2 - 252*ep2 - 3*C1**2) * D**6/720);
  const lon = (D
    - (1 + 2*T1 + C1) * D**3/6
    + (5 - 2*C1 + 28*T1 - 3*C1**2 + 8*ep2 + 24*T1**2) * D**5/120)
    / Math.cos(p1);
  return { lat: lat * (180/Math.PI), lng: (lon0 + lon) * (180/Math.PI) };
};

// Coordenadas aproximadas para bases sem medição real ainda
const GEO_FALLBACK = {
  "Quixeramobim": { lat: -5.20, lng: -39.29 },
  "Maranguape":   { lat: -3.90, lng: -38.68 },
};

const getCardGeo = (card) => {
  const coord = COORDINATES.find(c => c.municipality === card.municipality);
  if (coord) {
    const e = parseFloat(coord.east), n = parseFloat(coord.north);
    if (e > 1000 && n > 1000) return utmToLatLng(e, n);
  }
  return GEO_FALLBACK[card.municipality] ?? null;
};

// =============================================================================
// URL DA API BACKEND
// Em produção, troque pelo IP/domínio do servidor.
// =============================================================================
const API_URL = "http://192.168.100.40:3001";

// =============================================================================
// PASSO 1 — RÓTULOS DOS CAMPOS
// Para criar um novo campo: adicione "chave": "Rótulo" aqui,
// depois use a chave nos dados do CARDS e em alguma seção do MODAL_TABS.
// =============================================================================
const FIELD_LABELS = {
  code:             "Código",
  municipality:     "Município",
  state:            "Estado",
  location:         "Localidade",
  installDate:      "Implantação",
  finishedDate:     "Data de Encerramento",
  responsible:      "Responsável",
  receiver:         "Receptor",
  antenna:          "Antena",
  antennaHeight:    "Altura da Antena",
  situacao:         "Status",
  ultimaAtualizacao:"Última Atualização",
  // ↓ novos campos aqui
};

// =============================================================================
// PASSO 2 — ABAS E SEÇÕES DO MODAL
// Para uma nova aba: adicione um objeto { id, label, sections } no array.
// Para uma nova seção: adicione em sections[] de uma aba existente.
//
// Tipos de seção:
//   "grid"        → campos em grade (cols: 2 ou 3)
//   "text"        → campo único como bloco de parágrafo (field: "chave")
//   "coordinates" → tabela UTM automática (sem config extra)
// =============================================================================
const MODAL_TABS = [
  {
    id: "monograph",
    label: "MONOGRAFIA",
    sections: [
      {
        title: "Identificação da Base",
        type: "grid",
        cols: 3,
        fields: ["code", "municipality", "state", "location", "installDate", "finishedDate", "responsible"],
      },
      {
        title: "Localização",
        type: "map",
      },
      {
        title: "Equipamento",
        type: "grid",
        cols: 2,
        fields: ["receiver", "antenna", "antennaHeight"],
      },
      {
        title: "Descrição de Acesso",
        type: "text",
        field: "access",
      },
      {
        title: "Status de Operação",
        type: "grid",
        cols: 2,
        fields: ["situacao", "ultimaAtualizacao"],
      },
      {
        title: "Notas de Operação",
        type: "text",
        field: "operationStatus",
      },
      {
        title: "Coordenadas",
        type: "coordinates-archive",
      },
    ],
  },
  // ─── Exemplo de nova aba ────────────────────────────────────────────────
  // {
  //   id: "observations",
  //   label: "OBSERVAÇÕES",
  //   sections: [
  //     { title: "Notas Técnicas", type: "text", field: "notes" },
  //     { title: "Histórico", type: "grid", cols: 2, fields: ["lastMaint", "nextMaint"] },
  //   ],
  // },
];

// =============================================================================
// PASSO 3 — DADOS DAS BASES
// Edite backend/cards-data.js e rode: node upload-cards.js
// Os dados são carregados do backend em tempo de execução.
// =============================================================================
let CARDS = [];
// =============================================================================
// Motor de renderização — não precisa editar abaixo desta linha
// =============================================================================

const pageSections = Array.from(document.querySelectorAll("section"));
const navButtons   = Array.from(document.querySelectorAll("nav button"));
const cardsContainer = document.querySelector("#cards-container");

const drawCard = () => {
  CARDS.forEach((card) => {
    const div = document.createElement("div");
    const img = document.createElement("img");
    const h2  = document.createElement("h2");
    const p   = document.createElement("p");

    h2.textContent     = card.title;
    p.textContent      = card.finished ? "● FINALIZADA" : (card.mac ? "Consultando..." : "Saiba mais");
    p.className        = "card-status-text";
    img.src            = "assets/satellite.png";
    div.style.position = "relative";

    if (card.finished) {
      div.classList.add("card-finished");
      const badge = document.createElement("span");
      badge.className = "card-status-dot finished";
      badge.title     = "Base Finalizada";
      div.appendChild(badge);
    } else if (card.mac) {
      div.dataset.mac = card.mac;
      const badge = document.createElement("span");
      badge.className = "card-status-dot loading";
      badge.title     = "Consultando status...";
      div.appendChild(badge);
    }

    div.appendChild(img);
    div.appendChild(h2);
    div.appendChild(p);

    const btn = document.createElement("button");
    btn.textContent = card.finished ? "Base Finalizada" : "Acessar";
    btn.className   = card.finished ? "btn-acessar btn-finished" : "btn-acessar";
    btn.addEventListener("click", () => openModal(card));
    div.appendChild(btn);

    cardsContainer.appendChild(div);
  });
};

// ── Modal ────────────────────────────────────────────────────────────────────

const modalOverlay  = document.getElementById("modal-overlay");
const modalTitle    = document.getElementById("modal-title");
const modalCode     = document.getElementById("modal-code");
const modalLink     = document.getElementById("modal-link");
const modalClose    = document.getElementById("modal-close");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalTabsEl   = document.getElementById("modal-tabs");
const modalBodyEl   = document.getElementById("modal-body");

// Gera botões de aba e painéis a partir de MODAL_TABS
MODAL_TABS.forEach((tab, i) => {
  const btn = document.createElement("button");
  btn.type      = "button";
  btn.className = "modal-tab" + (i === 0 ? " active" : "");
  btn.setAttribute("data-tab", tab.id);
  btn.textContent = tab.label;
  modalTabsEl.appendChild(btn);

  const pane = document.createElement("div");
  pane.id        = `tab-${tab.id}`;
  pane.className = "modal-tab-content" + (i === 0 ? " active" : "");
  modalBodyEl.appendChild(pane);
});

const infoField = (label, value) => {
  let display;
  if (value === "SIM")
    display = `<span class="status-pill active">● ATIVA</span>`;
  else if (value === "NÃO")
    display = `<span class="status-pill inactive">● INATIVA</span>`;
  else if (value === "FINALIZADO")
    display = `<span class="status-pill finished">● FINALIZADO</span>`;
  else
    display = value ?? "—";

  return `<div class="info-field">
    <span class="info-label">${label}</span>
    <span class="info-value">${display}</span>
  </div>`;
};

const renderCoordinatesPane = (municipality) => {
  const bases = municipality ? COORDINATES.filter((c) => c.municipality === municipality) : [];
  if (!bases.length) return `<p class="empty-msg">Sem coordenadas cadastradas para esta base.</p>`;

  const rows = bases.map(({ radius, east, sigmaX, north, sigmaY, height, SigmaZ, location, antennaHeight }) => `
    <tr>
      <td data-header="Raio:">${radius}</td>
      <td data-header="Este:">${east}</td>
      <td data-header="Sigma X:">${sigmaX}</td>
      <td data-header="Norte:">${north}</td>
      <td data-header="Sigma Y:">${sigmaY}</td>
      <td data-header="Altura:">${height}</td>
      <td data-header="Sigma Z:">${SigmaZ}</td>
      <td data-header="Localidade:">${location}</td>
      <td data-header="Altura Antena:">${antennaHeight}</td>
    </tr>`).join("");

  return `<table>
    <thead><tr>
      <th>Raio</th><th>Este</th><th>Sigma X</th><th>Norte</th>
      <th>Sigma Y</th><th>Altura</th><th>Sigma Z</th>
      <th>Localidade</th><th>Altura Antena</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
};

const renderArchivedCoordinates = (coords) => {
  if (!coords || !coords.length)
    return `<p class="empty-msg">Nenhuma coordenada arquivada.</p>`;

  const rows = coords.map(({ radius, east, sigmaX, north, sigmaY, height, SigmaZ, location, antennaHeight }) => `
    <tr>
      <td data-header="Raio:">${radius}</td>
      <td data-header="Este:">${east}</td>
      <td data-header="Sigma X:">${sigmaX ?? "—"}</td>
      <td data-header="Norte:">${north}</td>
      <td data-header="Sigma Y:">${sigmaY ?? "—"}</td>
      <td data-header="Altura:">${height}</td>
      <td data-header="Sigma Z:">${SigmaZ ?? "—"}</td>
      <td data-header="Localidade:">${location ?? "—"}</td>
      <td data-header="Altura Antena:">${antennaHeight ?? "—"}</td>
    </tr>`).join("");

  return `<table>
    <thead><tr>
      <th>Raio</th><th>Este</th><th>Sigma X</th><th>Norte</th>
      <th>Sigma Y</th><th>Altura</th><th>Sigma Z</th>
      <th>Localidade</th><th>Altura Antena</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
};

const renderSection = (section, card) => {
  if (section.type === "map") {
    const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";
    return `<div class="mono-section">${header}<div id="modal-map" class="modal-map-container"></div></div>`;
  }
  if (section.type === "coordinates")         return renderCoordinatesPane(card.municipality);
  if (section.type === "coordinates-archive") {
    const archived = card.coordinates ?? [];
    const global = COORDINATES.filter((c) => c.municipality === card.municipality);
    const combined = [...global];
    archived.forEach((a) => {
      if (!combined.some((c) => c.radius === a.radius)) combined.push(a);
    });
    if (!combined.length) return "";
    const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";
    return `<div class="mono-section">${header}${renderArchivedCoordinates(combined)}</div>`;
  }

  const header = section.title ? `<p class="mono-section-title">${section.title}</p>` : "";

  if (section.type === "text") {
    const val = card[section.field];
    if (!val) return "";
    return `<div class="mono-section">${header}<p class="access-text">${val}</p></div>`;
  }

  const colsClass = section.cols === 2 ? "cols-2" : "";
  const fields = (section.fields || [])
    .map((key) => infoField(FIELD_LABELS[key] || key, card[key]))
    .join("");
  return `<div class="mono-section">${header}<div class="info-grid ${colsClass}">${fields}</div></div>`;
};

const activateModalTab = (id) => {
  modalTabsEl.querySelectorAll(".modal-tab").forEach((t) => t.classList.remove("active"));
  modalBodyEl.querySelectorAll(".modal-tab-content").forEach((t) => t.classList.remove("active"));
  modalTabsEl.querySelector(`[data-tab="${id}"]`).classList.add("active");
  document.getElementById(`tab-${id}`).classList.add("active");
};

let modalMap = null;

const openModal = (card) => {
  const liveData = card.finished
    ? { situacao: "FINALIZADO" }
    : (card.mac ? (baseStatusMap[card.mac] || {}) : {});
  const fullCard = { ...card, ...liveData };

  modalTitle.textContent  = fullCard.title;
  modalCode.textContent   = fullCard.code ? `BASE ${fullCard.code}` : "";
  modalLink.href          = fullCard.link || "#";
  modalLink.style.display = fullCard.finished ? "none" : "";
  document.getElementById("modal").classList.toggle("modal-finished", !!fullCard.finished);

  MODAL_TABS.forEach((tab) => {
    document.getElementById(`tab-${tab.id}`).innerHTML =
      tab.sections.map((s) => renderSection(s, fullCard)).join("");
  });

  activateModalTab(MODAL_TABS[0].id);
  modalOverlay.classList.remove("hidden");

  // Inicializa mapa do modal após o DOM estar visível
  requestAnimationFrame(() => {
    if (modalMap) { modalMap.remove(); modalMap = null; }
    const mapEl = document.getElementById("modal-map");
    const geo   = getCardGeo(card);
    if (!mapEl || !geo) return;

    modalMap = L.map("modal-map", {
      center:            [geo.lat, geo.lng],
      zoom:              14,
      zoomControl:       true,
      attributionControl: false,
      scrollWheelZoom:   false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18, subdomains: "abcd",
    }).addTo(modalMap);

    const live   = baseStatusMap[card.mac];
    const status = card.finished ? "finished"
      : live?.situacao === "SIM" ? "active"
      : live            ? "inactive"
      : card.mac        ? "loading" : "no-mac";

    L.marker([geo.lat, geo.lng], { icon: markerIcon(status) }).addTo(modalMap);
  });
};

const closeModal = () => {
  modalOverlay.classList.add("hidden");
  if (modalMap) { modalMap.remove(); modalMap = null; }
};

modalTabsEl.addEventListener("click", (e) => {
  const tab = e.target.closest(".modal-tab");
  if (tab) activateModalTab(tab.getAttribute("data-tab"));
});

modalClose.addEventListener("click", closeModal);
modalCloseBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModal(); });

const changeSection = (e) => {
  const target = e.target;
  const attr   = target.getAttribute("data-key");
  navButtons.forEach((it) => it.classList.remove("active"));
  target.classList.add("active");
  if (attr) {
    pageSections.forEach((it) => {
      if (it.getAttribute("id") === attr) it.classList.add("tab-active");
      else it.classList.remove("tab-active");
    });
  }
};

navButtons.forEach((it) => it.addEventListener("click", changeSection));


// =============================================================================
// INICIALIZAÇÃO — tenta carregar bases do backend, usa local como fallback
// =============================================================================

const init = async () => {
  try {
    const res = await fetch(`${API_URL}/api/cards`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) CARDS = data;
    }
  } catch { /* backend indisponível — usa CARDS local */ }
  CARDS.sort((a, b) => (a.finished === b.finished ? 0 : a.finished ? 1 : -1));
  drawCard();
  initMap();
};

// ── Status ao vivo (banco de dados) ──────────────────────────────────────────

let baseStatusMap = {};
let cardMarkers   = {};

const updateCardDots = () => {
  // Bases com finished:true têm dot próprio — não atualizar pelo banco
  document.querySelectorAll("[data-mac]").forEach((cardEl) => {
    const data = baseStatusMap[cardEl.dataset.mac];
    const dot  = cardEl.querySelector(".card-status-dot");
    if (!dot || !data) return;
    const ativa = data.situacao === "SIM";
    dot.className = `card-status-dot ${ativa ? "active" : "inactive"}`;
    dot.title     = ativa ? "Base Ativa" : "Base Inativa";
    const statusP = cardEl.querySelector(".card-status-text");
    if (statusP) statusP.textContent = ativa ? "● ATIVA" : "● INATIVA";
    const m = cardMarkers[cardEl.dataset.mac];
    if (m) {
      const el = m.getElement()?.querySelector(".map-marker");
      if (el) el.className = `map-marker ${ativa ? "active" : "inactive"}`;
    }
  });
};

const markerIcon = (status) => L.divIcon({
  html: `<div class="map-marker ${status}">
           <div class="marker-ring"></div>
           <div class="marker-ring delay"></div>
           <div class="marker-dot"></div>
         </div>`,
  className:   "",
  iconSize:    [28, 28],
  iconAnchor:  [14, 14],
  tooltipAnchor: [0, -14],
});

const initMap = () => {
  const map = L.map("map-canvas", {
    center: [-5.5, -39.5],
    zoom: 7,
    zoomControl: true,
    attributionControl: false,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    subdomains: "abcd",
  }).addTo(map);

  CARDS.forEach((card) => {
    const geo = getCardGeo(card);
    if (!geo) return;

    const status = card.finished ? "finished" : (card.mac ? "loading" : "no-mac");
    const marker = L.marker([geo.lat, geo.lng], { icon: markerIcon(status) }).addTo(map);

    marker.bindTooltip(card.title, {
      permanent:  false,
      direction:  "top",
      className:  "map-tooltip",
      offset:     [0, -4],
    });

    marker.on("click", () => openModal(card));
    if (card.mac) cardMarkers[card.mac] = marker;
  });

  window.addEventListener("resize", () => map.invalidateSize());
};

init();

const fetchBaseStatuses = async () => {
  try {
    const res  = await fetch(`${API_URL}/api/bases`);
    const rows = await res.json();
    rows.forEach(({ maquina, situacao, ultima_atualizacao }) => {
      baseStatusMap[maquina] = {
        situacao,
        ultimaAtualizacao: ultima_atualizacao
          ? new Date(ultima_atualizacao).toLocaleString("pt-BR")
          : "—",
      };
    });
    updateCardDots();
  } catch {
    console.warn("API de status indisponível — operando sem dados ao vivo.");
  }
};

fetchBaseStatuses();

document.getElementById("footer-year").textContent = new Date().getFullYear();
