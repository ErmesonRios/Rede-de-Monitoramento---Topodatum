require("dotenv").config();
const express        = require("express");
const cors           = require("cors");
const helmet         = require("helmet");
const rateLimit      = require("express-rate-limit");
const { Pool }       = require("pg");
const fs             = require("fs");
const path           = require("path");
const { parseString } = require("xml2js");

const CARDS_FILE = path.join(__dirname, "cards.json");

// =============================================================================
// BANCO DE DADOS
// =============================================================================
const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || "topodatum",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "",
});

// =============================================================================
// CAMPOS DO BANCO
// =============================================================================
const BASE_FIELDS = `
  maquina,
  nome_base,
  situacao,
  ultima_atualizacao,
  internet,
  online,
  situacao2
`;

// =============================================================================
// SEGURANÇA
// =============================================================================
const app  = express();
const PORT = process.env.API_PORT || 3001;

// 1. Headers de segurança (XSS, clickjacking, MIME sniff, etc.)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// 2. CORS — restringe origens permitidas
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // permite requisições sem origin (file://, Postman, upload-cards.js)
    if (!origin) return cb(null, true);
    // se ALLOWED_ORIGINS não configurado, bloqueia tudo que não é localhost
    if (ALLOWED_ORIGINS.length === 0) {
      const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      return cb(isLocal ? null : new Error("CORS bloqueado"), isLocal);
    }
    const ok = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
    cb(ok ? null : new Error("CORS bloqueado"), ok);
  },
}));

// 3. Rate limit geral — 150 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições. Tente novamente em 15 minutos." },
}));

// 4. Rate limit restrito para escrita — 10 req / hora por IP
const uploadLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de uploads atingido. Tente novamente em 1 hora." },
});

// 5. Chave de API para endpoints de escrita
const requireApiKey = (req, res, next) => {
  const key    = req.headers["x-api-key"];
  const secret = process.env.UPLOAD_KEY;
  if (!secret) return res.status(500).json({ error: "UPLOAD_KEY não configurada no servidor." });
  if (!key || key !== secret) return res.status(401).json({ error: "Não autorizado." });
  next();
};

// 6. Validação de MAC address
const MAC_RE = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i;
const validateMac = (req, res, next) => {
  if (!MAC_RE.test(req.params.mac))
    return res.status(400).json({ error: "Endereço MAC inválido." });
  next();
};

app.use(express.json({ limit: "100kb" }));

// =============================================================================
// CARDS — dados das bases
// =============================================================================

// POST /api/cards → requer chave de API + rate limit restrito
app.post("/api/cards", uploadLimit, requireApiKey,
  express.text({ type: "*/*", limit: "2mb" }),
  (req, res) => {
    parseString(req.body, { explicitArray: false, trim: true }, (err, result) => {
      if (err) return res.status(400).json({ error: "XML inválido." });

      const raw   = result?.bases?.base ?? [];
      const bases = Array.isArray(raw) ? raw : [raw];

      const cards = bases.map((b) => ({
        title:         b.title         ?? "",
        finished:      b.finished === "true",
        mac:           b.mac           ?? "",
        code:          b.code          ?? "",
        link:          b.link          ?? "",
        finishedDate:  b.finishedDate  ?? "",
        municipality:  b.municipality  ?? "",
        state:         b.state         ?? "",
        location:      b.location      ?? "",
        receiver:      b.receiver      ?? "",
        antenna:       b.antenna       ?? "",
        antennaHeight: b.antennaHeight ?? "",
        installDate:   b.installDate   ?? "",
        access:        b.access        ?? "",
        responsible:   b.responsible   ?? "",
        coordinates: b.coordinates?.point
          ? [].concat(b.coordinates.point).map((p) => ({
              radius:        p.radius        ?? "",
              east:          p.east          ?? "",
              sigmaX:        p.sigmaX        ?? "",
              north:         p.north         ?? "",
              sigmaY:        p.sigmaY        ?? "",
              height:        p.height        ?? "",
              SigmaZ:        p.sigmaZ        ?? "",
              location:      p.location      ?? "",
              antennaHeight: p.antennaHeight ?? "",
            }))
          : [],
      }));

      fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf8");
      res.json({ ok: true, total: cards.length });
    });
  }
);

// GET /api/cards → público (leitura)
app.get("/api/cards", (_req, res) => {
  if (!fs.existsSync(CARDS_FILE))
    return res.status(404).json({ error: "Nenhuma base importada ainda." });
  res.json(JSON.parse(fs.readFileSync(CARDS_FILE, "utf8")));
});

// =============================================================================
// BASES (banco de dados)
// =============================================================================

// GET /api/bases → todas as bases
app.get("/api/bases", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT ${BASE_FIELDS} FROM idace.bases`);
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao consultar o banco de dados." });
  }
});

// GET /api/base/:mac → base pelo MAC (valida formato antes de consultar)
app.get("/api/base/:mac", validateMac, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${BASE_FIELDS} FROM idace.bases WHERE maquina = $1`,
      [req.params.mac]
    );
    if (!rows.length) return res.status(404).json({ error: "Base não encontrada." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao consultar o banco de dados." });
  }
});

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada." }));

app.listen(PORT, () =>
  console.log(`API Topodatum rodando → http://localhost:${PORT}`)
);
