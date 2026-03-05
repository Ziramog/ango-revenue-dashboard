import { useState, useEffect } from "react";
import { TrendingUp, Users, ShoppingCart, RefreshCw } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
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
    <div style={{ background: "white", borderRadius: 14, padding: "18px 22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        {Icon && <div style={{ padding: 7, borderRadius: 9, backgroundColor: color + "20" }}><Icon size={16} style={{ color }} /></div>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", marginBottom: 3 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
}

function EvoTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
          <span style={{ fontSize: 13, color: "#475569" }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.value < 0 ? "#ef4444" : "#1e293b" }}>{fmt(p.value, currency)}</span>
        </div>
      ))}
      {payload.length >= 2 && (
        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Neto: </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#6366f1" }}>
            {fmt((payload[0]?.value || 0) - Math.abs(payload[1]?.value || 0), currency)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AnnualDashboard({ currency }) {
  const [year, setYear]       = useState(2024);
  const [monthly, setMonthly] = useState([]);
  const [custs, setCusts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState("bar");

  const sk = currency === "ARS" ? "sales_ars" : "sales_usd";
  const ak = currency === "ARS" ? "net_ars"   : "net_usd";
  const vk = currency === "ARS" ? "total_ars" : "total_usd";

  useEffect(() => {
    setLoading(true);
    Promise.all([getMonthly(year), getCustomers({ year })])
      .then(([m, c]) => {
        const rows = m.data;
        const data = MONTHS.map((mn, i) => {
          const r      = rows.find(x => Number(x.month) === i + 1) || {};
          const sales  = Number(r[sk]) || 0;
          const net    = Number(r[ak]) || 0;
          const credit = Math.max(0, sales - net);
          return { month: mn, Facturas: sales, "Notas Crédito": credit, Neto: net };
        });
        setMonthly(data);
        setCusts(c.data.slice(0, 5));
        setLoading(false);
      });
  }, [year, currency]);

  if (loading) return <div style={{ color: "#94a3b8", padding: 40, fontSize: 15 }}>Cargando {year}...</div>;

  const totSales  = monthly.reduce((s, r) => s + r.Facturas, 0);
  const totCredit = monthly.reduce((s, r) => s + r["Notas Crédito"], 0);
  const totNet    = monthly.reduce((s, r) => s + r.Neto, 0);

  const activeMths = monthly.filter(r => r.Facturas > 0);
  const bestMonth  = activeMths.length ? activeMths.reduce((a, b) => a.Facturas > b.Facturas ? a : b) : null;
  const worstMonth = activeMths.length ? activeMths.reduce((a, b) => a.Facturas < b.Facturas ? a : b) : null;

  const cumulativeData = monthly.reduce((acc, row, i) => {
    const prev = i > 0 ? acc[i - 1].Acumulado : 0;
    acc.push({ ...row, Acumulado: prev + row.Neto });
    return acc;
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>Dashboard Anual</div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 12 }}>
          {YEARS.map(y => (
            <button key={y} onClick={() => setYear(y)} style={{
              padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 700,
              background: year === y ? "white" : "transparent",
              color: year === y ? "#1e293b" : "#94a3b8",
              boxShadow: year === y ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>{y}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <KPI label="Facturación bruta" value={fmt(totSales, currency)}  sub="total del año"              color="#10b981" Icon={TrendingUp} />
        <KPI label="Notas de crédito"  value={fmt(totCredit, currency)} sub="total devoluciones"         color="#ef4444" Icon={RefreshCw} />
        <KPI label="Clientes activos"  value={custs.length}             sub={`con actividad en ${year}`} color="#6366f1" Icon={Users} />
        <KPI label="Facturación neta"  value={fmt(totNet, currency)}    sub="bruta menos NC"             color="#f59e0b" Icon={ShoppingCart} />
      </div>

      {/* Evolution chart */}
      <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Evolución mensual {year}</div>
            {bestMonth && (
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
                Mejor mes: <span style={{ color: "#10b981", fontWeight: 700 }}>{bestMonth.month} ({fmt(bestMonth.Facturas, currency)})</span>
                {worstMonth && worstMonth.month !== bestMonth.month && (
                  <> · Menor: <span style={{ color: "#f59e0b", fontWeight: 700 }}>{worstMonth.month} ({fmt(worstMonth.Facturas, currency)})</span></>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", padding: 3, borderRadius: 9 }}>
            {[["bar","Barras"],["line","Líneas"],["cumulative","Acumulado"]].map(([k, l]) => (
              <button key={k} onClick={() => setChartType(k)} style={{
                padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                background: chartType === k ? "white" : "transparent",
                color: chartType === k ? "#1e293b" : "#94a3b8",
                boxShadow: chartType === k ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>{l}</button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={270}>
          {chartType === "bar" ? (
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency)} width={75} />
              <Tooltip content={<EvoTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="Facturas"       fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Notas Crédito"  fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency)} width={75} />
              <Tooltip content={<EvoTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Line type="monotone" dataKey="Facturas"      stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Notas Crédito" stroke="#fca5a5" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 3" />
              <Line type="monotone" dataKey="Neto"          stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          ) : (
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency)} width={75} />
              <Tooltip formatter={(v) => [fmt(v, currency), "Acumulado neto"]} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Line type="monotone" dataKey="Acumulado" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Table + Top clients */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #f8fafc" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b" }}>Detalle mensual {year}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Mes","Facturas","NC","Neto"].map(h => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: h === "Mes" ? "left" : "right", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.map((r, i) => {
                const hasData = r.Facturas > 0 || r["Notas Crédito"] > 0;
                return (
                  <tr key={i} style={{ borderTop: "1px solid #f8fafc", opacity: hasData ? 1 : 0.35 }}>
                    <td style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "#475569" }}>{r.month}</td>
                    <td style={{ padding: "8px 16px", fontSize: 13, textAlign: "right", color: "#10b981", fontFamily: "monospace" }}>{r.Facturas > 0 ? fmt(r.Facturas, currency) : "—"}</td>
                    <td style={{ padding: "8px 16px", fontSize: 13, textAlign: "right", color: "#ef4444", fontFamily: "monospace" }}>{r["Notas Crédito"] > 0 ? "-" + fmt(r["Notas Crédito"], currency) : "—"}</td>
                    <td style={{ padding: "8px 16px", fontSize: 13, textAlign: "right", fontWeight: 700, color: r.Neto >= 0 ? "#1e293b" : "#ef4444", fontFamily: "monospace" }}>{hasData ? fmt(r.Neto, currency) : "—"}</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: "2px solid #f1f5f9", background: "#f8fafc" }}>
                <td style={{ padding: "9px 16px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>TOTAL</td>
                <td style={{ padding: "9px 16px", fontSize: 13, textAlign: "right", fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>{fmt(totSales, currency)}</td>
                <td style={{ padding: "9px 16px", fontSize: 13, textAlign: "right", fontWeight: 800, color: "#ef4444", fontFamily: "monospace" }}>-{fmt(totCredit, currency)}</td>
                <td style={{ padding: "9px 16px", fontSize: 13, textAlign: "right", fontWeight: 800, color: "#6366f1", fontFamily: "monospace" }}>{fmt(totNet, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Top 5 clientes — {year}</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 18 }}>Montos facturados únicamente en {year}</div>
          {custs.length === 0 ? (
            <div style={{ color: "#94a3b8", textAlign: "center", padding: 40, fontSize: 14 }}>Sin actividad en {year}</div>
          ) : custs.map((c, i) => {
            const val = Number(c[vk]);
            const max = Number(custs[0]?.[vk]);
            return (
              <div key={c.id} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700, width: 22 }}>#{i + 1}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#475569" }}>{c.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {c.category_name && (
                      <span style={{ fontSize: 11, color: "white", padding: "2px 8px", borderRadius: 10, background: c.category_color || "#94a3b8" }}>{c.category_name}</span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#1e293b" }}>{fmt(val, currency)}</span>
                  </div>
                </div>
                <div style={{ height: 7, background: "#f1f5f9", borderRadius: 4 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: c.category_color || "#6366f1", width: `${max > 0 ? (val / max * 100) : 0}%`, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, textAlign: "right" }}>{max > 0 ? (val / max * 100).toFixed(1) : 0}% del top cliente</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
