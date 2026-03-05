import { useState, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { getCompare, getCustomers } from "../api";

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const YEARS  = [2022, 2023, 2024, 2025, 2026];
const COLOR_A = "#10b981";
const COLOR_B = "#f59e0b";

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

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
          <span style={{ fontSize: 13, color: "#475569" }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{fmt(p.value, currency)}</span>
        </div>
      ))}
      {payload.length === 2 && payload[0].value && payload[1].value && (
        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 6, paddingTop: 6 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>Diferencia: </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: payload[1].value >= payload[0].value ? "#10b981" : "#ef4444" }}>
            {payload[1].value >= payload[0].value ? "+" : ""}{fmt(payload[1].value - payload[0].value, currency)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function YearComparison({ currency }) {
  const [ya, setYa]           = useState(2023);
  const [yb, setYb]           = useState(2024);
  const [monthly, setMonthly] = useState([]);
  const [custComp, setCustComp] = useState([]);
  const [loading, setLoading] = useState(true);

  const sk = currency === "ARS" ? "sales_ars" : "sales_usd";
  const vk = currency === "ARS" ? "total_ars" : "total_usd";

  useEffect(() => {
    setLoading(true);
    Promise.all([getCompare(ya, yb), getCustomers({ year: ya }), getCustomers({ year: yb })])
      .then(([cmp, cuA, cuB]) => {
        const data = MONTHS.map((mn, i) => {
          const ra = cmp.data.find(r => Number(r.year) === ya && Number(r.month) === i + 1) || {};
          const rb = cmp.data.find(r => Number(r.year) === yb && Number(r.month) === i + 1) || {};
          return { month: mn, [ya]: Number(ra[sk]) || 0, [yb]: Number(rb[sk]) || 0 };
        });
        setMonthly(data);

        const allIds = new Set([...cuA.data.slice(0, 8).map(c => c.id), ...cuB.data.slice(0, 8).map(c => c.id)]);
        const mapA   = Object.fromEntries(cuA.data.map(c => [c.id, c]));
        const mapB   = Object.fromEntries(cuB.data.map(c => [c.id, c]));
        const rows   = [...allIds].map(id => {
          const ca = mapA[id], cb = mapB[id];
          const name = (ca || cb).name.split(" ").slice(0, 3).join(" ");
          const valA = Number(ca?.[vk]) || 0;
          const valB = Number(cb?.[vk]) || 0;
          return { name, [ya]: valA, [yb]: valB, total: valA + valB };
        }).filter(r => r[ya] > 0 || r[yb] > 0).sort((a, b) => b.total - a.total).slice(0, 10);
        setCustComp(rows);
        setLoading(false);
      });
  }, [ya, yb, currency]);

  if (loading) return <div style={{ color: "#94a3b8", padding: 40, fontSize: 15 }}>Cargando comparación...</div>;

  const totA   = monthly.reduce((s, r) => s + r[ya], 0);
  const totB   = monthly.reduce((s, r) => s + r[yb], 0);
  const growth = totA > 0 ? ((totB - totA) / totA * 100).toFixed(1) : 0;
  const pos    = parseFloat(growth) >= 0;

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 22 }}>Comparación entre Años</div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>Año A:</span>
          <select value={ya} onChange={e => setYa(parseInt(e.target.value))} style={{
            padding: "9px 14px", background: "#f0fdf4", border: `2px solid ${COLOR_A}`,
            borderRadius: 9, fontSize: 14, fontWeight: 700, color: "#065f46", outline: "none"
          }}>
            {YEARS.filter(y => y !== yb).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span style={{ color: "#e2e8f0", fontSize: 22, fontWeight: 800 }}>vs</span>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>Año B:</span>
          <select value={yb} onChange={e => setYb(parseInt(e.target.value))} style={{
            padding: "9px 14px", background: "#fffbeb", border: `2px solid ${COLOR_B}`,
            borderRadius: 9, fontSize: 14, fontWeight: 700, color: "#92400e", outline: "none"
          }}>
            {YEARS.filter(y => y !== ya).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{
          marginLeft: "auto", padding: "13px 22px", borderRadius: 12, fontSize: 20, fontWeight: 800,
          background: pos ? "#f0fdf4" : "#fef2f2", color: pos ? "#16a34a" : "#dc2626",
          border: `1px solid ${pos ? "#bbf7d0" : "#fecaca"}`
        }}>
          {growth > 0 ? "+" : ""}{growth}% en {currency}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 22 }}>
        <div style={{ borderRadius: 14, padding: 18, background: "#f0fdf4", border: `2px solid ${COLOR_A}30` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLOR_A, textTransform: "uppercase", marginBottom: 5 }}>{ya} — Año A</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#065f46" }}>{fmt(totA, currency)}</div>
        </div>
        <div style={{ borderRadius: 14, padding: 18, background: "#fffbeb", border: `2px solid ${COLOR_B}30` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLOR_B, textTransform: "uppercase", marginBottom: 5 }}>{yb} — Año B</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#92400e" }}>{fmt(totB, currency)}</div>
        </div>
        <div style={{ borderRadius: 14, padding: 18, background: pos ? "#f0fdf4" : "#fef2f2", border: `1px solid ${pos ? "#bbf7d0" : "#fecaca"}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: pos ? "#16a34a" : "#dc2626", textTransform: "uppercase", marginBottom: 5 }}>Diferencia</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: pos ? "#16a34a" : "#dc2626" }}>{fmt(totB - totA, currency)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 22 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 16 }}>Evolución mensual</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency)} width={75} />
              <ReferenceLine y={0} stroke="#e2e8f0" />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey={String(ya)} stroke={COLOR_A} strokeWidth={2.5} dot={{ r: 4, fill: COLOR_A }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey={String(yb)} stroke={COLOR_B} strokeWidth={2.5} dot={{ r: 4, fill: COLOR_B }} activeDot={{ r: 6 }} strokeDasharray="8 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Top clientes: {ya} vs {yb}</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16 }}>Montos por año por separado</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={custComp} layout="vertical" margin={{ left: 0, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => fmt(v, currency)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={105} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 13 }} formatter={(v) => <span style={{ color: v == ya ? "#065f46" : "#92400e", fontWeight: 700 }}>{v}</span>} />
              <Bar dataKey={String(ya)} fill={COLOR_A} radius={[0, 4, 4, 0]} />
              <Bar dataKey={String(yb)} fill={COLOR_B} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #f8fafc", fontSize: 15, fontWeight: 700, color: "#64748b" }}>
          Detalle mensual: {ya} vs {yb}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: "9px 18px", textAlign: "left",  fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Mes</th>
              <th style={{ padding: "9px 18px", textAlign: "right", fontSize: 12, fontWeight: 700, color: COLOR_A,   textTransform: "uppercase" }}>{ya}</th>
              <th style={{ padding: "9px 18px", textAlign: "right", fontSize: 12, fontWeight: 700, color: COLOR_B,   textTransform: "uppercase" }}>{yb}</th>
              <th style={{ padding: "9px 18px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Dif.</th>
              <th style={{ padding: "9px 18px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((r, i) => {
              const vA = r[ya] || 0, vB = r[yb] || 0;
              const diff = vB - vA;
              const pct  = vA > 0 ? ((diff / vA) * 100).toFixed(1) : null;
              const hasAny = vA > 0 || vB > 0;
              return (
                <tr key={i} style={{ borderTop: "1px solid #f8fafc", opacity: hasAny ? 1 : 0.3 }}>
                  <td style={{ padding: "8px 18px", fontSize: 14, fontWeight: 600, color: "#475569" }}>{r.month}</td>
                  <td style={{ padding: "8px 18px", fontSize: 13, textAlign: "right", color: COLOR_A, fontFamily: "monospace", fontWeight: 600 }}>{vA > 0 ? fmt(vA, currency) : "—"}</td>
                  <td style={{ padding: "8px 18px", fontSize: 13, textAlign: "right", color: COLOR_B, fontFamily: "monospace", fontWeight: 600 }}>{vB > 0 ? fmt(vB, currency) : "—"}</td>
                  <td style={{ padding: "8px 18px", fontSize: 13, textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: diff >= 0 ? "#10b981" : "#ef4444" }}>
                    {hasAny ? (diff >= 0 ? "+" : "") + fmt(diff, currency) : "—"}
                  </td>
                  <td style={{ padding: "8px 18px", fontSize: 13, textAlign: "right", fontWeight: 700, color: pct === null ? "#94a3b8" : parseFloat(pct) >= 0 ? "#10b981" : "#ef4444" }}>
                    {pct !== null ? (parseFloat(pct) >= 0 ? "+" : "") + pct + "%" : "—"}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: "2px solid #f1f5f9", background: "#f8fafc" }}>
              <td style={{ padding: "9px 18px", fontSize: 14, fontWeight: 800, color: "#1e293b" }}>TOTAL</td>
              <td style={{ padding: "9px 18px", fontSize: 13, textAlign: "right", fontWeight: 800, color: COLOR_A, fontFamily: "monospace" }}>{fmt(totA, currency)}</td>
              <td style={{ padding: "9px 18px", fontSize: 13, textAlign: "right", fontWeight: 800, color: COLOR_B, fontFamily: "monospace" }}>{fmt(totB, currency)}</td>
              <td style={{ padding: "9px 18px", fontSize: 13, textAlign: "right", fontWeight: 800, color: pos ? "#10b981" : "#ef4444", fontFamily: "monospace" }}>{pos ? "+" : ""}{fmt(totB - totA, currency)}</td>
              <td style={{ padding: "9px 18px", fontSize: 13, textAlign: "right", fontWeight: 800, color: pos ? "#10b981" : "#ef4444" }}>{pos ? "+" : ""}{growth}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
