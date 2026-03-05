# Ango Metalúrgica — Revenue Dashboard

A full-stack revenue analytics dashboard built for an Argentine metalworking company to analyze AFIP invoices from 2022 to 2026.

![Dashboard Preview](screenshots/global.png)

## 🚀 Live Demo

> Deployed on Railway — [ango-dashboard-production.up.railway.app](https://ango-dashboard-production.up.railway.app)  
> Login: `Ango` / `10251275`

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Recharts, Lucide Icons |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ETL | Python (pandas, fuzzy matching) |
| Deployment | Railway |
| Build Tool | Vite 5 |

---

## ✨ Features

### 📊 Global Dashboard
- Total revenue KPIs across all years
- Annual trend bar chart (gross vs net)
- Revenue breakdown by category (pie chart)
- Top 5 clients — all-time ranking

### 📅 Dashboard Anual
- Year selector (2022–2026)
- Monthly evolution chart with 3 view modes: **Bars**, **Lines**, **Cumulative**
- Monthly breakdown table with invoices, credit notes and net
- Top 5 clients for the selected year

### 📈 Comparar Años
- Side-by-side year comparison with % growth
- Monthly evolution line chart (green vs amber)
- Per-year client comparison bar chart
- Month-by-month detail table with diff and %

### 👥 Explorador de Clientes
- Multi-client evolution line chart (pin up to 8 clients)
- Search and filter by category
- Per-client yearly bar chart
- Full transaction history per client

### 🏷️ Categorías
- Revenue share by category (pie chart)
- Client count per category
- Average ticket per category

### 🔍 Calidad de Datos
- Fuzzy duplicate customer detection
- Approve / reject merge suggestions

### 🔐 Authentication
- Username + password login screen
- Session token stored in `sessionStorage`
- Auto logout on expired session

### 💱 ARS / USD Toggle
- Switch between Argentine pesos and USD
- Exchange rates stored in DB per month/year

---

## 🏗️ Architecture

```
revenue_dashboard/          ← Node.js API server
├── server.js               ← Express API + serves React build
├── etl.py                  ← Python ETL for importing AFIP invoices
├── railway.toml            ← Railway deployment config
├── nixpacks.toml           ← Build config (Node 22, Vite 5)
└── revenue-frontend/       ← React app (built into /dist)
    ├── src/
    │   ├── App.jsx         ← Main app with auth gate + sidebar
    │   ├── api.js          ← Axios client (auto switches dev/prod URL)
    │   └── pages/
    │       ├── Login.jsx
    │       ├── GlobalDashboard.jsx
    │       ├── AnnualDashboard.jsx
    │       ├── YearComparison.jsx
    │       ├── CustomerExplorer.jsx
    │       ├── CategoryAnalysis.jsx
    │       └── QualityCenter.jsx
```

---

## 🗄️ Database Schema

```sql
customers        -- canonical customer names + category
transactions     -- all AFIP invoices and credit notes
categories       -- customer segments with color codes
exchange_rates   -- monthly ARS/USD rates
customer_aliases -- fuzzy-matched name variants
duplicate_review -- pending merge decisions
v_transactions   -- view joining all tables
```

---

## ⚙️ Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Python 3.9+ (for ETL)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/ango-revenue-dashboard.git
cd ango-revenue-dashboard
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your local PostgreSQL credentials
```

### 3. Install dependencies
```bash
npm install
cd revenue-frontend && npm install && cd ..
```

### 4. Start the API
```bash
node server.js
```

### 5. Start the frontend (separate terminal)
```bash
cd revenue-frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🚢 Deploying to Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Add a **PostgreSQL** plugin on Railway, then set these environment variables on your service:

```
APP_USER=your_username
APP_PASS=your_password
PGHOST=your_railway_host
PGPORT=your_port
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=your_pg_password
```

Migrate your local database:
```bash
pg_dump -U postgres your_db > backup.sql
psql -h your_railway_host -p PORT -U postgres -d railway < backup.sql
```

---

## 📦 ETL Pipeline

The Python ETL (`etl.py`) handles:
- Argentine number format parsing (`.` thousands, `,` decimals)
- Automatic credit note (Nota de Crédito) detection via `is_refund` flag
- Fuzzy customer name matching to detect duplicates
- CUIT extraction and validation
- Automatic exchange rate lookup per invoice date

```bash
python etl.py invoices.xlsx
```

---

## 🔑 Key Technical Decisions

- **Credit notes handled via SUM** — `NOT is_refund` filter was removed from customer totals so `SUM(amount_ars)` naturally nets out credit notes against invoices
- **Per-year customer filtering** — year parameter passed to `/api/customers` so annual rankings show only that year's activity
- **Dynamic API base URL** — `import.meta.env.PROD` switches between `localhost:3001` (dev) and `/api` (production) automatically
- **Token auth** — simple in-memory token set on the server, Bearer token stored in `sessionStorage` on the client

---

## 📸 Screenshots

| Global | Annual | Comparison |
|--------|--------|------------|
| ![](screenshots/global.png) | ![](screenshots/annual.png) | ![](screenshots/compare.png) |

---

## 👤 Author

**Juan Gomariz**  
Full-stack developer  
[github.com/YOUR_USERNAME](https://github.com/YOUR_USERNAME)

---

## 📄 License

Private project — all rights reserved.  
Client data has been excluded from this repository.
