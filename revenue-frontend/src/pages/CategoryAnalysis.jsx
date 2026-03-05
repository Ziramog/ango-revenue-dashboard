import { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getCategories, getCustomers } from "../api";

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

export default function CategoryAnalysis({ currency }) {
  const [cats, setCats]     = useState([]);
  const [custs, setCusts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const vk = currency === "ARS" ? "total_ars" : "total_usd";

  useEffect(() => {
    Promise.all([getCategories(), getCustomers()])
      .then(([c, cu]) => { setCats(c.data); setCusts(cu.data); setLoading(false); });
  }, [currency]);

  if (loading) return <div style={{ color: "#94a3b8", padding: 40, fontSize: 15 }}>Cargando categorías...</div>;

  if (cats.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 22 }}>Análisis por Categoría</div>
        <div style={{ background: "white", borderRadius: 14, padding: 48, textAlign: "center", border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>🏷️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 10 }}>Todavía no hay categorías cargadas</div>
          <div style={{ fontSize: 14, color: "#94a3b8", maxWidth: 420, margin: "0 auto" }}>
            Agregá categorías directamente en PostgreSQL:<br /><br />
            <code style={{ background: "#f1f5f9", padding: "5px 10px", borderRadius: 6, fontSize: 13 }}>
              INSERT INTO categories (name, color) VALUES ('Retail', '#6366f1');
            </code><br /><br />
            <code style={{ background: "#f1f5f9", padding: "5px 10px", borderRadius: 6, fontSize: 13 }}>
              UPDATE customers SET category_id = 1 WHERE canonical_name ILIKE '%nombre%';
            </code>
          </div>
        </div>
      </div>
    );
  }

  const catTotals = cats.map(c => ({
    ...c,
    total: custs.filter(cu => cu.category_id === c.id).reduce((s, cu) => s + Number(cu[vk]), 0),
    clientCount: custs.filter(cu => cu.category_id === c.id).length,
  })).sort((a, b) => b.total - a.total);

  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0);
  const pieData    = catTotals.filter(c => c.total > 0);
  const barData    = catTotals.map(c => ({ name: c.name, Clientes: c.clientCount, color: c.color }));

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 22 }}>Análisis por Categoría</div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cats.length, 5)}, 1fr)`, gap: 14, marginBottom: 22 }}>
        {catTotals.map(c => (
          <div key={c.id} style={{ background: "white", borderRadius: 14, padding: 18, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c.color, marginBottom: 10 }} />
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 5 }}>{c.name}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{fmt(c.total, currency)}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{grandTotal > 0 ? (c.total / grandTotal * 100).toFixed(1) : 0}% · {c.clientCount} clientes</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 22 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 18 }}>Participación por facturación</div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={42}>
                {pieData.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [fmt(v, currency), n]} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 18 }}>Clientes por categoría</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="name" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="Clientes" radius={[4, 4, 0, 0]}>
                {barData.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["Categoría","Clientes","Facturación total","% del total","Ticket promedio"].map(h => (
                <th key={h} style={{ padding: "11px 18px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catTotals.map(c => (
              <tr key={c.id} style={{ borderTop: "1px solid #f8fafc" }}>
                <td style={{ padding: "11px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "11px 18px", fontSize: 14, color: "#475569" }}>{c.clientCount}</td>
                <td style={{ padding: "11px 18px", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{fmt(c.total, currency)}</td>
                <td style={{ padding: "11px 18px", fontSize: 14, color: "#64748b" }}>{grandTotal > 0 ? (c.total / grandTotal * 100).toFixed(1) : 0}%</td>
                <td style={{ padding: "11px 18px", fontSize: 14, color: "#64748b" }}>{fmt(c.clientCount > 0 ? c.total / c.clientCount : 0, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
