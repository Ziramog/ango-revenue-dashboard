import { useState, useEffect, useMemo } from "react";
import { Search, Users, TrendingUp, X } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { getCustomers, getCustomerTxs, getCategories } from "../api";

const YEARS  = [2022, 2023, 2024, 2025, 2026];
const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

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

function EvoTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid #f1f5f9", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
          <span style={{ fontSize: 13, color: "#475569", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{fmt(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CustomerExplorer({ currency }) {
  const [custs, setCusts]             = useState([]);
  const [cats, setCats]               = useState([]);
  const [allTxs, setAllTxs]           = useState({});
  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("");
  const [selected, setSelected]       = useState(null);
  const [selectedTxs, setSelectedTxs] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [txLoading, setTxLoading]     = useState(false);
  const [pinnedIds, setPinnedIds]     = useState([]);

  const vk = currency === "ARS" ? "total_ars" : "total_usd";

  useEffect(() => {
    Promise.all([getCustomers(), getCategories()]).then(([c, cat]) => {
      setCusts(c.data);
      setCats(cat.data);
      setPinnedIds(c.data.slice(0, 5).map(x => x.id));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (pinnedIds.length === 0) return;
    pinnedIds.forEach(id => {
      if (allTxs[id]) return;
      getCustomerTxs(id).then(r => setAllTxs(prev => ({ ...prev, [id]: r.data })));
    });
  }, [pinnedIds]);

  useEffect(() => {
    if (!selected) return;
    setTxLoading(true);
    getCustomerTxs(selected.id).then(r => {
      setSelectedTxs(r.data);
      setTxLoading(false);
      setAllTxs(prev => ({ ...prev, [selected.id]: r.data }));
    });
  }, [selected]);

  const filtered = custs
    .filter(c => (!catFilter || String(c.category_id) === String(catFilter)) && (c.name || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b[vk]) - Number(a[vk]));

  const evolutionData = useMemo(() => {
    return YEARS.map(y => {
      const row = { year: String(y) };
      pinnedIds.forEach(id => {
        const cust = custs.find(c => c.id === id);
        if (!cust) return;
        const txs = allTxs[id] || [];
        const shortName = cust.name.split(" ").slice(0, 2).join(" ");
        row[shortName] = txs
          .filter(t => new Date(t.date).getFullYear() === y && !t.is_refund)
          .reduce((s, t) => s + Number(currency === "ARS" ? t.amount_ars : t.amount_usd), 0);
      });
      return row;
    });
  }, [pinnedIds, allTxs, currency, custs]);

  const selectedYearlyData = useMemo(() => {
    if (!selected) return [];
    return YEARS.map(y => ({
      year: String(y),
      total: selectedTxs
        .filter(t => new Date(t.date).getFullYear() === y && !t.is_refund)
        .reduce((s, t) => s + Number(currency === "ARS" ? t.amount_ars : t.amount_usd), 0),
    }));
  }, [selected, selectedTxs, currency]);

  const togglePin = (id) => {
    setPinnedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 8 ? prev : [...prev, id]);
  };

  const pinnedCusts = pinnedIds.map(id => custs.find(c => c.id === id)).filter(Boolean);

  if (loading) return <div style={{ color: "#94a3b8", padding: 40, fontSize: 15 }}>Cargando clientes...</div>;

  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>Explorador de Clientes</div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 22 }}>Evolución anual y detalle por cliente</div>

      {/* Evolution chart */}
      <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>Evolución anual por cliente</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>
              {pinnedIds.length} cliente{pinnedIds.length !== 1 ? "s" : ""} seleccionado{pinnedIds.length !== 1 ? "s" : ""} — máximo 8
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end", maxWidth: 520 }}>
            {pinnedCusts.map((c, i) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 11px",
                borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: COLORS[i % COLORS.length] + "18",
                border: `1px solid ${COLORS[i % COLORS.length]}40`,
                color: COLORS[i % COLORS.length],
              }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: COLORS[i % COLORS.length] }} />
                {c.name.split(" ").slice(0, 2).join(" ")}
                <button onClick={() => togglePin(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: COLORS[i % COLORS.length], lineHeight: 1, marginLeft: 2 }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={270}>
          <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
            <XAxis dataKey="year" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => fmt(v, currency)} width={75} />
            <Tooltip content={<EvoTooltip currency={currency} />} />
            {pinnedCusts.map((c, i) => (
              <Line key={c.id} type="monotone" dataKey={c.name.split(" ").slice(0, 2).join(" ")}
                stroke={COLORS[i % COLORS.length]} strokeWidth={2.5}
                dot={{ r: 5, fill: COLORS[i % COLORS.length] }} activeDot={{ r: 7 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* List + Detail */}
      <div style={{ display: "flex", gap: 18 }}>
        <div style={{ width: 290, display: "flex", flexDirection: "column", gap: 7, maxHeight: 540, overflowY: "auto" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#cbd5e1" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
              style={{ width: "100%", padding: "8px 11px 8px 32px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            style={{ padding: "8px 11px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none" }}>
            <option value="">Todas las categorías</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {filtered.map((c, i) => {
            const isPinned   = pinnedIds.includes(c.id);
            const pinIdx     = pinnedIds.indexOf(c.id);
            const isSelected = selected?.id === c.id;
            return (
              <div key={c.id} style={{
                padding: "11px 13px", borderRadius: 11, cursor: "pointer",
                border: `1px solid ${isSelected ? "#93c5fd" : isPinned ? COLORS[pinIdx % COLORS.length] + "40" : "#f1f5f9"}`,
                background: isSelected ? "#eff6ff" : "white", transition: "all 0.1s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 700, width: 20 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    onClick={() => setSelected(c)}>{c.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setSelected(c)} style={{
                      padding: "4px 9px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: isSelected ? "#dbeafe" : "#f1f5f9", fontSize: 11, fontWeight: 600,
                      color: isSelected ? "#2563eb" : "#64748b",
                    }}>
                      <TrendingUp size={11} style={{ display: "inline", marginRight: 3 }} />Detalle
                    </button>
                    <button onClick={() => togglePin(c.id)} style={{
                      padding: "4px 9px", borderRadius: 7, border: "none", cursor: "pointer",
                      background: isPinned ? COLORS[pinIdx % COLORS.length] + "20" : "#f1f5f9",
                      fontSize: 11, fontWeight: 600,
                      color: isPinned ? COLORS[pinIdx % COLORS.length] : "#94a3b8",
                    }}>
                      {isPinned ? "✓ En gráfico" : "+ Gráfico"}
                    </button>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>{fmt(c[vk], currency)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 540 }}>
          {selected ? (
            <div style={{ background: "white", borderRadius: 14, padding: 22, border: "1px solid #f1f5f9", height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>{selected.name}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>CUIT: {selected.cuit}</div>
                  {selected.category_name && (
                    <span style={{ fontSize: 12, color: "white", padding: "3px 10px", borderRadius: 12, background: selected.category_color || "#94a3b8", marginTop: 7, display: "inline-block" }}>
                      {selected.category_name}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#3b82f6" }}>{fmt(selected[vk], currency)}</div>
                  <div style={{ fontSize: 13, color: "#94a3b8" }}>{selected.transaction_count} facturas · {selected.refund_count || 0} NC</div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 9 }}>Facturación por año</div>
                {txLoading ? (
                  <div style={{ color: "#94a3b8", fontSize: 13, padding: 20, textAlign: "center" }}>Cargando...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={135}>
                    <BarChart data={selectedYearlyData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v, currency)} width={65} />
                      <Tooltip formatter={v => [fmt(v, currency), "Facturado"]} />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {selectedYearlyData.map((d, i) => <Cell key={i} fill={d.total > 0 ? "#3b82f6" : "#e2e8f0"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 9 }}>Últimos comprobantes</div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                {selectedTxs.slice(0, 20).map(t => (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 12px", borderRadius: 9,
                    background: t.is_refund ? "#fef2f2" : "#f8fafc", fontSize: 13,
                  }}>
                    <span style={{ color: "#94a3b8", width: 96, flexShrink: 0 }}>{String(t.date).slice(0, 10)}</span>
                    <span style={{ flex: 1, color: "#475569", fontStyle: t.is_refund ? "italic" : "normal", fontSize: 12 }}>{t.tipo}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, color: t.is_refund ? "#ef4444" : "#475569" }}>
                      {fmt(currency === "ARS" ? t.amount_ars : t.amount_usd, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: "#f8fafc", borderRadius: 14, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #e2e8f0" }}>
              <div style={{ textAlign: "center", color: "#cbd5e1" }}>
                <Users size={40} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontSize: 14 }}>Hacé clic en "Detalle" para ver un cliente</div>
                <div style={{ fontSize: 13, marginTop: 5 }}>o "+ Gráfico" para agregarlo a la evolución</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
