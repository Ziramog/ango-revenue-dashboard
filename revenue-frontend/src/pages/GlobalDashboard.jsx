import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Users, ShoppingCart } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getKPIs, getMonthly, getCustomers, getCategories } from "../api";

function fmt(n, currency) {
  if (!n) return currency === "USD" ? "USD 0" : "$0";
  const a = Math.abs(Number(n)), s = Number(n) < 0 ? "-" : "";
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

export default function GlobalDashboard({ currency }) {
  const [kpis, setKpis]       = useState(null);
  const [yearly, setYearly]   = useState([]);
  const [catData, setCatData] = useState([]);
  const [topCusts, setTopCusts] = useState([]);
  const [loading, setLoading] = useState(true);

  const sk = currency === "ARS" ? "sales_ars" : "sales_usd";
  const ak = currency === "ARS" ? "net_ars"   : "net_usd";
  const vk = currency === "ARS" ? "total_ars" : "total_usd";

  useEffect(() => {
    setLoading(true);
    Promise.all([getKPIs(), getMonthly(), getCustomers(), getCategories()])
      .then(([k, m, c, cat]) => {
        setKpis(k.data);
        const byYear = {};
        m.data.forEach(r => {
          if (!byYear[r.year]) byYear[r.year] = { year: String(r.year), Bruta: 0, Neta: 0 };
          byYear[r.year].Bruta += Number(r[sk]) || 0;
          byYear[r.year].Neta  += Number(r[ak]) || 0;
        });
        setYearly(Object.values(byYear).sort((a, b) => a.year - b.year));
        setTopCusts(c.data.slice(0, 5));
        const byCat = {};
        c.data.forEach(cu => {
          const cn = cu.category_name || "Sin categoría";
          const cc = cu.category_color || "#94a3b8";
          if (!byCat[cn]) byCat[cn] = { name: cn, color: cc, total: 0 };
          byCat[cn].total += Number(cu[vk]) || 0;
        });
        setCatData(Object.values(byCat));
        setLoading(false);
      });
  }, [currency]);

  if (loading) return <div style={{ color: "#94a3b8", padding: 40, fontSize: 15 }}>Cargando dashboard global...</div>;

  const gross = Number(currency === "ARS" ? kpis?.total_ars : kpis?.total_usd);
  const net   = Number(currency === "ARS" ? kpis?.net_ars   : kpis?.net_usd);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b" }}>Dashboard Global</div>
        <span style={{ fontSize: 14, color: "#94a3b8" }}>2022 – 2026 · CUIT 20102512759</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <KPI label="Facturación bruta" value={fmt(gross, currency)} sub="acumulado total"              color="#6366f1" Icon={TrendingUp} />
        <KPI label="Facturación neta"  value={fmt(net, currency)}   sub="descontando NC"               color="#10b981" Icon={DollarSign} />
        <KPI label="Clientes únicos"   value={kpis?.customers}      sub={`${kpis?.transactions} comprobantes`} color="#f59e0b" Icon={Users} />
        <KPI label="Notas de crédito"  value={kpis?.refund_count || 0} sub="documentos de crédito"    color="#ef4444" Icon={ShoppingCart} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, marginBottom: 22 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 18 }}>Tendencia anual</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="year" tick={{ fontSize: 13 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency)} width={75} />
              <Tooltip formatter={(v, n) => [fmt(v, currency), n]} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="Bruta" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Neta"  fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 18 }}>Por categoría</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={catData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35}>
                {catData.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [fmt(v, currency), n]} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#64748b", marginBottom: 18 }}>Top 5 clientes — histórico</div>
        {topCusts.map((c, i) => {
          const val = Number(c[vk]);
          const max = Number(topCusts[0]?.[vk]);
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#cbd5e1", width: 26 }}>#{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{c.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {c.category_name && (
                      <span style={{ fontSize: 12, color: "white", padding: "2px 9px", borderRadius: 12, background: c.category_color || "#94a3b8" }}>
                        {c.category_name}
                      </span>
                    )}
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#6366f1" }}>{fmt(val, currency)}</span>
                  </div>
                </div>
                <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4 }}>
                  <div style={{ height: "100%", borderRadius: 4, backgroundColor: c.category_color || "#6366f1", width: `${max > 0 ? (val / max * 100) : 0}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
