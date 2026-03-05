import { useState, useEffect } from "react";
import { TrendingUp, Users, ShoppingCart, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getMonthly, getCustomers } from "../api";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const YEARS  = [2022, 2023, 2024, 2025, 2026];

function fmt(n, currency) {
  const a = Math.abs(Number(n) || 0), s = Number(n) < 0 ? "-" : "";
  if (currency === "USD") {
    if (a >= 1e6) return s + "USD " + (a / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return s + "USD " + (a / 1e3).toFixed(1) + "k";
    return s + "USD " + a.toFixed(0);
  }
  if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(1) + "M";
  if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(0) + "k";
  return s + "$" + a.toFixed(0);
}

function KPI({ label, value, sub, color, Icon }) {
  return (
    <div style={{ background: "white", borderRadius: 12, padding: "16px 20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        {Icon && <div style={{ padding: 6, borderRadius: 8, backgroundColor: color + "20" }}><Icon size={14} style={{ color }} /></div>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

export default function AnnualDashboard({ currency }) {
  const [year, setYear]       = useState(2024);
  const [monthly, setMonthly] = useState([]);
  const [custs, setCusts]     = useState([]);
  const [loading, setLoading] = useState(true);

  const sk = currency === "ARS" ? "sales_ars" : "sales_usd";
  const ak = currency === "ARS" ? "net_ars"   : "net_usd";
  const vk = currency === "ARS" ? "total_ars" : "total_usd";

  useEffect(() => {
    setLoading(true);
    // Pass year so API returns totals for that year only
    Promise.all([getMonthly(year), getCustomers({ year })])
      .then(([m, c]) => {
        const rows = m.data;

        const data = MONTHS.map((mn, i) => {
          const r      = rows.find(x => Number(x.month) === i + 1) || {};
          const sales  = Number(r[sk]) || 0;
          const net    = Number(r[ak]) || 0;
          const credit = Math.max(0, sales - net);
          return { month: mn, Facturas: sales, "Notas Crédito": credit };
        });
        setMonthly(data);
        setCusts(c.data.slice(0, 5));
        setLoading(false);
      });
  }, [year, currency]);

  if (loading) return <div style={{ color: "#94a3b8", padding: 40 }}>Cargando {year}...</div>;

  const totSales  = monthly.reduce((s, r) => s + r.Facturas, 0);
  const totCredit = monthly.reduce((s, r) => s + r["Notas Crédito"], 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Dashboard Anual</div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 10 }}>
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              background: year === y ? "white" : "transparent",
              color: year === y ? "#1e293b" : "#94a3b8",
              boxShadow: year === y ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>{y}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <KPI label="Facturación bruta" value={fmt(totSales, currency)}             sub="total del año"           color="#10b981" Icon={TrendingUp} />
        <KPI label="Notas de crédito"  value={fmt(totCredit, currency)}            sub="total devoluciones"      color="#ef4444" Icon={RefreshCw} />
        <KPI label="Clientes activos"  value={custs.length}                        sub={`con actividad en ${year}`} color="#6366f1" Icon={Users} />
        <KPI label="Facturación neta"  value={fmt(totSales - totCredit, currency)} sub="bruta menos NC"          color="#f59e0b" Icon={ShoppingCart} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 16 }}>Facturación mensual {year}</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v, currency)} width={70} />
              <Tooltip formatter={(v, n) => [fmt(v, currency), n]} />
              <Legend />
              <Bar dataKey="Facturas"      fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Notas Crédito" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: 12, padding: 20, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>
            Top 5 clientes — {year}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 16 }}>
            Montos facturados únicamente en {year}
          </div>
          {custs.length === 0 ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: 40 }}>Sin actividad en {year}</div>
          ) : custs.map((c, i) => {
            const val = Number(c[vk]);
            const max = Number(custs[0]?.[vk]);
            return (
              <div key={c.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>
                    <span style={{ color: "#cbd5e1", marginRight: 4 }}>#{i + 1}</span>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b" }}>{fmt(val, currency)}</span>
                </div>
                <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3 }}>
                  <div style={{ height: "100%", borderRadius: 3, background: c.category_color || "#6366f1", width: `${max > 0 ? (val / max * 100) : 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
