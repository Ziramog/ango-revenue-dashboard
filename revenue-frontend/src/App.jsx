import { useState } from "react";
import { Globe, Calendar, BarChart2, Users, Tag, AlertCircle, LogOut } from "lucide-react";
import GlobalDashboard  from "./pages/GlobalDashboard";
import AnnualDashboard  from "./pages/AnnualDashboard";
import YearComparison   from "./pages/YearComparison";
import CustomerExplorer from "./pages/CustomerExplorer";
import CategoryAnalysis from "./pages/CategoryAnalysis";
import QualityCenter    from "./pages/QualityCenter";
import Login            from "./pages/Login";

const NAV = [
  { id: "global",    label: "Global",           Icon: Globe,       color: "#1d4ed8" },
  { id: "annual",    label: "Dashboard Anual",  Icon: Calendar,    color: "#10b981" },
  { id: "compare",   label: "Comparar Años",    Icon: BarChart2,   color: "#7c3aed" },
  { id: "customers", label: "Clientes",         Icon: Users,       color: "#3b82f6" },
  { id: "category",  label: "Categorías",       Icon: Tag,         color: "#d97706" },
  { id: "quality",   label: "Calidad de Datos", Icon: AlertCircle, color: "#f97316" },
];

export default function App() {
  const [section, setSection]   = useState("global");
  const [currency, setCurrency] = useState("ARS");
  const [authed, setAuthed]     = useState(!!sessionStorage.getItem("ango_token"));

  const handleLogout = () => {
    sessionStorage.removeItem("ango_token");
    setAuthed(false);
  };

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  const pages = {
    global:    <GlobalDashboard  currency={currency} />,
    annual:    <AnnualDashboard  currency={currency} />,
    compare:   <YearComparison   currency={currency} />,
    customers: <CustomerExplorer currency={currency} />,
    category:  <CategoryAnalysis currency={currency} />,
    quality:   <QualityCenter />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div style={{
        width: 234, background: "white", borderRight: "1px solid #e2e8f0",
        display: "flex", flexDirection: "column", flexShrink: 0,
        boxShadow: "2px 0 12px rgba(0,0,0,0.06)",
      }}>

        {/* Logo */}
        <div style={{
          padding: "22px 18px 16px", borderBottom: "1px solid #f1f5f9",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <img src="/LogoANgo_FBlanco.jpg" alt="Ango Metalúrgica"
            style={{ width: "100%", maxWidth: 168, borderRadius: 8, objectFit: "contain" }} />
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center" }}>
            Revenue Dashboard
          </div>
        </div>

        {/* ARS / USD toggle */}
        <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
            {["ARS", "USD"].map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{
                flex: 1, padding: "7px 0", fontSize: 13, fontWeight: 800,
                borderRadius: 6, border: "none", cursor: "pointer",
                background: currency === c ? "white" : "transparent",
                color: currency === c ? "#1d4ed8" : "#94a3b8",
                boxShadow: currency === c ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>
                {c === "ARS" ? "🇦🇷 ARS" : "🇺🇸 USD"}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ id, label, Icon, color }) => {
            const active = section === id;
            return (
              <button key={id} onClick={() => setSection(id)} style={{
                display: "flex", alignItems: "center", gap: 11,
                padding: "11px 13px", borderRadius: 10, border: "none",
                cursor: "pointer", textAlign: "left", width: "100%",
                fontSize: 14, fontWeight: 600,
                background: active ? color + "12" : "transparent",
                color: active ? "#1e293b" : "#64748b",
                transition: "all 0.15s",
                borderLeft: active ? `3px solid ${color}` : "3px solid transparent",
              }}>
                <Icon size={16} style={{ color: active ? color : "#cbd5e1", flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #f1f5f9" }}>
          <button onClick={handleLogout} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer",
            background: "#fef2f2", color: "#dc2626", fontSize: 13, fontWeight: 600,
            transition: "all 0.15s",
          }}>
            <LogOut size={14} />
            Cerrar sesión
          </button>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "#cbd5e1" }}>
            CUIT 20102512759 · 2022–2026
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28, background: "#f8fafc" }}>
        {pages[section]}
      </div>
    </div>
  );
}
