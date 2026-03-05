import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { getDuplicates, resolveDuplicate } from "../api";

export default function QualityCenter() {
  const [dupes, setDupes]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDuplicates().then(r => { setDupes(r.data); setLoading(false); });
  }, []);

  const resolve = async (id, status, canonical_name) => {
    await resolveDuplicate(id, { status, canonical_name });
    setDupes(prev => prev.map(d => d.id === id ? { ...d, status, canonical_name } : d));
  };

  const pending = dupes.filter(d => d.status === "pending").length;

  if (loading) return <div style={{ color: "#94a3b8", padding: 40, fontSize: 15 }}>Cargando datos de calidad...</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: 10, background: "#fff7ed", borderRadius: 12 }}>
            <AlertCircle size={22} style={{ color: "#f97316" }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b" }}>Centro de Calidad de Datos</div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 2 }}>Clientes duplicados detectados por similitud de nombre</div>
          </div>
        </div>
        {pending > 0 && (
          <span style={{ padding: "5px 14px", background: "#fff7ed", color: "#c2410c", borderRadius: 20, fontSize: 13, fontWeight: 700 }}>
            {pending} pendientes
          </span>
        )}
      </div>

      {dupes.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
          <CheckCircle size={44} style={{ margin: "0 auto 14px", color: "#4ade80" }} />
          <div style={{ fontSize: 16 }}>No se detectaron duplicados</div>
        </div>
      ) : dupes.map(d => (
        <div key={d.id} style={{
          background: "white", borderRadius: 14, padding: "18px 22px", marginBottom: 12,
          borderLeft: `4px solid ${d.status === "pending" ? "#fb923c" : d.status === "approved" ? "#4ade80" : "#e2e8f0"}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: "#334155", fontSize: 15 }}>{d.name_a}</span>
                <span style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 15 }}>↔</span>
                <span style={{ fontWeight: 700, color: "#334155", fontSize: 15 }}>{d.name_b}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ height: 7, width: 130, background: "#e2e8f0", borderRadius: 4 }}>
                  <div style={{ height: "100%", borderRadius: 4, background: "#fb923c", width: `${(d.similarity * 100).toFixed(0)}%` }} />
                </div>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{(d.similarity * 100).toFixed(0)}% similitud</span>
              </div>
            </div>
            {d.status === "pending" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => resolve(d.id, "approved", d.name_b)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
                  background: "#f0fdf4", color: "#15803d", border: "none", borderRadius: 9,
                  cursor: "pointer", fontSize: 13, fontWeight: 600
                }}>
                  <CheckCircle size={14} /> Fusionar → {d.name_b}
                </button>
                <button onClick={() => resolve(d.id, "rejected", null)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "8px 14px",
                  background: "#f8fafc", color: "#64748b", border: "none", borderRadius: 9,
                  cursor: "pointer", fontSize: 13, fontWeight: 600
                }}>
                  <XCircle size={14} /> Rechazar
                </button>
              </div>
            ) : (
              <span style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: d.status === "approved" ? "#f0fdf4" : "#f8fafc",
                color: d.status === "approved" ? "#15803d" : "#94a3b8"
              }}>
                {d.status === "approved" ? `✓ → ${d.canonical_name}` : "✗ Rechazado"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
