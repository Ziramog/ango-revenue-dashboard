require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors    = require("cors");
const crypto  = require("crypto");
const path    = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ── DATABASE ──────────────────────────────────────────────────────────────
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || "localhost",
        port:     parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME     || "hgc6_risk_office",
        user:     process.env.DB_USER     || "postgres",
        password: process.env.DB_PASSWORD || "",
      }
);

// ── AUTH ──────────────────────────────────────────────────────────────────
const VALID_USER = process.env.APP_USER || "Ango";
const VALID_PASS = process.env.APP_PASS || "10251275";
const validTokens = new Set();

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username === VALID_USER && password === VALID_PASS) {
    const token = crypto.randomBytes(32).toString("hex");
    validTokens.add(token);
    return res.json({ token });
  }
  return res.status(401).json({ error: "Credenciales incorrectas" });
});

// Protect all other /api routes
app.use("/api", (req, res, next) => {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !validTokens.has(token)) return res.status(401).json({ error: "No autorizado" });
  next();
});

// ── GLOBAL KPIs ───────────────────────────────────────────────────────────
app.get("/api/global/kpis", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        SUM(CASE WHEN NOT is_refund THEN amount_ars END)  AS total_ars,
        SUM(CASE WHEN NOT is_refund THEN amount_usd END)  AS total_usd,
        SUM(amount_ars)                                   AS net_ars,
        SUM(amount_usd)                                   AS net_usd,
        COUNT(DISTINCT customer_id)                       AS customers,
        COUNT(*)                                          AS transactions,
        SUM(CASE WHEN is_refund THEN 1 ELSE 0 END)        AS refund_count
      FROM v_transactions`);
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── MONTHLY REVENUE ───────────────────────────────────────────────────────
app.get("/api/revenue/monthly", async (req, res) => {
  try {
    const { year } = req.query;
    const condition = year ? `WHERE year = ${parseInt(year)}` : "";
    const { rows } = await pool.query(`
      SELECT year, month,
        SUM(CASE WHEN NOT is_refund THEN amount_ars END) AS sales_ars,
        SUM(CASE WHEN NOT is_refund THEN amount_usd END) AS sales_usd,
        SUM(amount_ars)                                  AS net_ars,
        SUM(amount_usd)                                  AS net_usd,
        COUNT(*)                                         AS count,
        SUM(CASE WHEN is_refund THEN 1 ELSE 0 END)       AS refund_count
      FROM v_transactions ${condition}
      GROUP BY year, month ORDER BY year, month`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────
app.get("/api/customers", async (req, res) => {
  try {
    const { category, search, year } = req.query;
    const conditions = [];
    if (year)     conditions.push(`year = ${parseInt(year)}`);
    if (category) conditions.push(`category_id = ${parseInt(category)}`);
    if (search)   conditions.push(`customer_name ILIKE '%${search.replace(/'/g, "")}%'`);
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const { rows } = await pool.query(`
      SELECT
        customer_id                                        AS id,
        customer_name                                      AS name,
        cuit,
        category_id,
        category_name,
        category_color,
        SUM(amount_ars)                                    AS total_ars,
        SUM(amount_usd)                                    AS total_usd,
        SUM(CASE WHEN NOT is_refund THEN amount_ars END)   AS gross_ars,
        SUM(CASE WHEN NOT is_refund THEN amount_usd END)   AS gross_usd,
        COUNT(CASE WHEN NOT is_refund THEN 1 END)          AS transaction_count,
        COUNT(CASE WHEN is_refund THEN 1 END)              AS refund_count,
        MIN(date)                                          AS first_purchase,
        MAX(date)                                          AS last_purchase
      FROM v_transactions ${where}
      GROUP BY customer_id, customer_name, cuit, category_id, category_name, category_color
      HAVING SUM(amount_ars) > 0
      ORDER BY SUM(amount_ars) DESC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/customers/:id/transactions", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM v_transactions WHERE customer_id = $1 ORDER BY date DESC LIMIT 200`,
      [parseInt(req.params.id)]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CATEGORIES ────────────────────────────────────────────────────────────
app.get("/api/categories", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM categories ORDER BY name");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── EXCHANGE RATES ────────────────────────────────────────────────────────
app.get("/api/exchange-rates", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM exchange_rates ORDER BY year, month");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DATA QUALITY ──────────────────────────────────────────────────────────
app.get("/api/quality/duplicates", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM duplicate_review ORDER BY similarity DESC");
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch("/api/quality/duplicates/:id", async (req, res) => {
  try {
    const { status, canonical_name } = req.body;
    const { rows } = await pool.query(
      `UPDATE duplicate_review SET status=$1, canonical_name=$2, resolved_at=NOW() WHERE id=$3 RETURNING *`,
      [status, canonical_name, parseInt(req.params.id)]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── YEAR COMPARISON ───────────────────────────────────────────────────────
app.get("/api/compare", async (req, res) => {
  try {
    const { year_a, year_b } = req.query;
    const { rows } = await pool.query(`
      SELECT year, month,
        SUM(CASE WHEN NOT is_refund THEN amount_ars END) AS sales_ars,
        SUM(CASE WHEN NOT is_refund THEN amount_usd END) AS sales_usd
      FROM v_transactions WHERE year IN ($1, $2)
      GROUP BY year, month ORDER BY year, month`,
      [parseInt(year_a), parseInt(year_b)]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CATEGORY REVENUE ──────────────────────────────────────────────────────
app.get("/api/categories/revenue", async (req, res) => {
  try {
    const { year } = req.query;
    const condition = year ? `AND year = ${parseInt(year)}` : "";
    const { rows } = await pool.query(`
      SELECT category_id, category_name, category_color, year, month,
        SUM(CASE WHEN NOT is_refund THEN amount_ars END) AS sales_ars,
        SUM(CASE WHEN NOT is_refund THEN amount_usd END) AS sales_usd
      FROM v_transactions WHERE category_id IS NOT NULL ${condition}
      GROUP BY category_id, category_name, category_color, year, month
      ORDER BY year, month`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SERVE REACT BUILD ─────────────────────────────────────────────────────
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server on port ${PORT}`));
