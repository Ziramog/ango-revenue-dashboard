"""
etl.py  —  Import AFIP "Mis Comprobantes Emitidos" + exchange rates into PostgreSQL
Requirements: pip install pandas openpyxl psycopg2-binary rapidfuzz python-dotenv
"""

import os, glob
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from rapidfuzz import fuzz, process
from dotenv import load_dotenv

load_dotenv()

# ── Always resolve paths relative to this script's folder ──────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

DB = {
    "host":     os.getenv("DB_HOST", "localhost"),
    "port":     int(os.getenv("DB_PORT", 5433)),
    "dbname":   os.getenv("DB_NAME", "schema"),
    "user":     os.getenv("DB_USER", "postgres"),
    "password": os.getenv("Discipline2026.", ""),
}

# ── AFIP column mapping ─────────────────────────────────────────────────────
COL_FECHA   = "Fecha"
COL_TIPO    = "Tipo"
COL_PV      = "Punto de Venta"
COL_NUM     = "Número Desde"
COL_CLIENTE = "Denominación Receptor"
COL_CUIT    = "Nro. Doc. Receptor"
COL_TOTAL   = "Imp. Total"

REFUND_TYPES = {"nota de crédito", "nota de credito", "nc"}

def is_refund(tipo: str) -> bool:
    return any(r in tipo.lower() for r in REFUND_TYPES)

# ── Argentine number format parser ─────────────────────────────────────────
def parse_ars_amount(val):
    """
    Handle Argentine number format: 1.234.567,89 → 1234567.89
    Also handles: 1234567.89, 1234567,89, 1.234.567
    """
    s = str(val).strip().replace("$", "").replace(" ", "").replace("\xa0", "")
    if not s or s in ("nan", "-", "", "None"):
        return 0.0

    dots   = s.count(".")
    commas = s.count(",")

    if commas == 1 and dots >= 1:
        # Argentine format: 1.234.567,89 → remove dots, replace comma
        s = s.replace(".", "").replace(",", ".")
    elif commas == 0 and dots == 1:
        # Standard float: 1234567.89 → keep as is
        pass
    elif commas == 0 and dots > 1:
        # Thousands only, no decimals: 1.234.567 → remove dots
        s = s.replace(".", "")
    elif commas == 1 and dots == 0:
        # 1234567,89 → replace comma with dot
        s = s.replace(",", ".")
    elif commas > 1:
        # 1,234,567.89 US format → remove commas
        s = s.replace(",", "")

    try:
        return float(s)
    except Exception:
        return 0.0

# ── 1. Load exchange rates ──────────────────────────────────────────────────
def load_exchange_rates(conn, csv_path: str):
    df = pd.read_csv(csv_path, parse_dates=[0])
    df.columns = ["date", "rate"]
    df["year"]  = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df = df.groupby(["year", "month"])["rate"].last().reset_index()
    rows = [(int(r.year), int(r.month), float(r.rate)) for r in df.itertuples()]
    with conn.cursor() as cur:
        execute_values(cur,
            """INSERT INTO exchange_rates (year, month, rate)
               VALUES %s ON CONFLICT (year, month) DO UPDATE SET rate = EXCLUDED.rate""",
            rows)
    conn.commit()
    print(f"✓ {len(rows)} exchange rates loaded")

# ── 2. Read & clean one AFIP Excel file ────────────────────────────────────
def read_afip_file(path: str) -> pd.DataFrame:
    print(f"  Reading: {os.path.basename(path)}")

    # AFIP files have a title row — try skip=1 first, fallback to skip=0
    df = None
    for skip in [1, 0]:
        try:
            tmp = pd.read_excel(path, skiprows=skip, dtype=str)
            tmp.columns = tmp.columns.str.strip()
            if COL_FECHA in tmp.columns and COL_CLIENTE in tmp.columns:
                df = tmp
                break
        except Exception as e:
            print(f"    ⚠ skip={skip} failed: {e}")
            continue

    if df is None:
        print(f"  ❌ Could not parse {os.path.basename(path)}, skipping.")
        return pd.DataFrame()

    # Debug: print columns found
    print(f"    Columns: {list(df.columns)}")

    df["date"]    = pd.to_datetime(df[COL_FECHA], dayfirst=True, errors="coerce")
    df["tipo"]    = df[COL_TIPO].str.strip()
    df["pv"]      = pd.to_numeric(df.get(COL_PV, 0), errors="coerce").fillna(0).astype(int)
    df["numero"]  = df.get(COL_NUM, pd.Series(dtype=str)).astype(str).str.strip()
    df["cliente"] = df[COL_CLIENTE].str.strip().str.upper()
    df["cuit"]    = df.get(COL_CUIT, pd.Series(dtype=str)).astype(str).str.strip()

    # ── Parse amounts using Argentine format handler ──
    df["amount"]  = df[COL_TOTAL].apply(parse_ars_amount)

    # Debug: show a sample of raw vs parsed amounts
    print(f"    Sample amounts (raw → parsed):")
    sample = df[[COL_TOTAL, "amount"]].dropna().head(5)
    for _, row in sample.iterrows():
        print(f"      '{row[COL_TOTAL]}' → {row['amount']:.2f}")

    df["is_refund"]   = df["tipo"].apply(is_refund)
    # Credit notes must be negative
    df.loc[df["is_refund"] & (df["amount"] > 0), "amount"] *= -1

    df["source_file"] = os.path.basename(path)

    result = df[
        ["date","tipo","pv","numero","cliente","cuit","amount","is_refund","source_file"]
    ].dropna(subset=["date"])

    refund_count = result["is_refund"].sum()
    print(f"    → {len(result)} rows ({refund_count} notas de crédito)")
    return result

# ── 3. Deduplicate customer names (fuzzy match) ─────────────────────────────
def resolve_customers(conn, all_names: list, threshold: int = 88) -> dict:
    unique  = sorted(set(all_names))
    groups  = []
    visited = set()

    for name in unique:
        if name in visited:
            continue
        matches = process.extract(
            name, unique,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=threshold
        )
        group = {m[0] for m in matches}
        groups.append(group)
        visited.update(group)

    name_to_id = {}
    with conn.cursor() as cur:
        for group in groups:
            canonical = max(group, key=len)
            cur.execute(
                "INSERT INTO customers (canonical_name) VALUES (%s) RETURNING id",
                (canonical,)
            )
            cust_id = cur.fetchone()[0]
            for alias in group:
                name_to_id[alias] = cust_id
                cur.execute(
                    """INSERT INTO customer_aliases (customer_id, alias_name)
                       VALUES (%s, %s) ON CONFLICT DO NOTHING""",
                    (cust_id, alias)
                )
            if len(group) > 1:
                names = sorted(group)
                for i in range(len(names)):
                    for j in range(i + 1, len(names)):
                        score = fuzz.token_sort_ratio(names[i], names[j]) / 100
                        cur.execute(
                            """INSERT INTO duplicate_review (name_a, name_b, similarity)
                               VALUES (%s, %s, %s)""",
                            (names[i], names[j], score)
                        )
    conn.commit()
    print(f"✓ {len(name_to_id)} aliases → {len(groups)} canonical customers")
    return name_to_id

# ── 4. Insert transactions ──────────────────────────────────────────────────
def insert_transactions(conn, df: pd.DataFrame, name_to_id: dict):
    rows = []
    for r in df.itertuples():
        rows.append((
            r.date.date(),
            r.tipo,
            int(r.pv),
            str(r.numero),
            name_to_id.get(r.cliente),
            r.cliente,
            r.cuit,
            float(r.amount),
            bool(r.is_refund),
            r.source_file
        ))
    with conn.cursor() as cur:
        execute_values(cur,
            """INSERT INTO transactions
               (date, tipo, punto_venta, numero, customer_id, raw_customer_name,
                raw_cuit, amount_ars, is_refund, source_file)
               VALUES %s""",
            rows)
    conn.commit()
    print(f"✓ {len(rows)} transactions inserted")

# ── MAIN ───────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    conn = psycopg2.connect(**DB)
    print("✓ Connected to PostgreSQL")

    # Load exchange rates
    load_exchange_rates(conn, os.path.join(SCRIPT_DIR, "Valor_dolar.csv"))

    # Find all Excel files in the same folder as this script
    excel_files = sorted(glob.glob(os.path.join(SCRIPT_DIR, "*.xlsx")))
    print(f"\nFound {len(excel_files)} Excel files:")
    for f in excel_files:
        print(f"  → {os.path.basename(f)}")
    print()

    # Read and clean all files
    all_dfs = [read_afip_file(f) for f in excel_files]
    all_dfs = [df for df in all_dfs if not df.empty]

    if not all_dfs:
        print("❌ No data read. Check that column names match AFIP format.")
        conn.close()
        exit(1)

    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\n✓ {len(combined)} total rows across all files")

    # Show year totals before inserting so you can verify
    print("\n── Revenue preview by year ──────────────────")
    for yr in sorted(combined["date"].dt.year.unique()):
        yrdf = combined[combined["date"].dt.year == yr]
        bruta = yrdf[~yrdf["is_refund"]]["amount"].sum()
        neta  = yrdf["amount"].sum()
        print(f"  {yr}: bruta={bruta:>18,.2f}  neta={neta:>18,.2f}  rows={len(yrdf)}")
    print("─────────────────────────────────────────────\n")

    # Resolve customers
    name_to_id = resolve_customers(conn, combined["cliente"].dropna().tolist())

    # Insert transactions
    insert_transactions(conn, combined, name_to_id)

    conn.close()
    print("\n🎉 ETL complete! Your data is in PostgreSQL.")