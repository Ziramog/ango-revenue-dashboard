import { useState } from "react";
import { login } from "../api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) { setError("Ingresá usuario y contraseña"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await login(username, password);
      sessionStorage.setItem("ango_token", res.data.token);
      onLogin();
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)",
    }}>
      <div style={{
        background: "white", borderRadius: 20, padding: "48px 44px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.10)", width: "100%", maxWidth: 400,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <img
            src="/LogoANgo_FBlanco.jpg"
            alt="Ango Metalúrgica"
            style={{ maxWidth: 200, marginBottom: 12 }}
          />
          <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Revenue Dashboard
          </div>
        </div>

        {/* Fields */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 7 }}>
            Usuario
          </label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ingresá tu usuario"
            autoFocus
            style={{
              width: "100%", padding: "12px 16px",
              border: "1.5px solid #e2e8f0", borderRadius: 10,
              fontSize: 15, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 7 }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ingresá tu contraseña"
            style={{
              width: "100%", padding: "12px 16px",
              border: "1.5px solid #e2e8f0", borderRadius: 10,
              fontSize: 15, outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 20, padding: "10px 14px",
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 9, fontSize: 14, color: "#dc2626", fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "14px",
            background: loading ? "#93c5fd" : "#1d4ed8",
            color: "white", border: "none", borderRadius: 10,
            fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#cbd5e1" }}>
          Ango Metalúrgica · Acceso restringido
        </div>
      </div>
    </div>
  );
}
