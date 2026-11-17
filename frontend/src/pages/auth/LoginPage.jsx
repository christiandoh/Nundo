import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, LockKeyhole } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";
import { API_BASE } from "@/lib/api.js";
import logo from "@/pages/assets/logo2.png";

export function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
   const { saveAuth } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Impossible de se connecter.");
      }
      saveAuth(data.token, data.user);
      const role = data.user?.role;
      if (role === "admin") navigate("/dashboard/admin");
      else if (role === "recruiter") navigate("/dashboard/recruiter");
      else navigate("/dashboard/worker");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-glass">
        <div className="auth-logo-circle">
          <img src={logo} alt="NUNDO" className="auth-logo-img" />
        </div>
        <div className="auth-title">Connexion</div>
        <p className="auth-subtitle">
          Retrouve ton compte avec ton numéro ivoirien en toute sécurité.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <span className="auth-field-icon">
              <User size={14} />
            </span>
            <Input
              id="login-phone"
              className="auth-field-input"
              placeholder="+225 07 00 00 00"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <span className="auth-field-icon">
              <LockKeyhole size={14} />
            </span>
            <Input
              id="login-password"
              type="password"
              className="auth-field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
          <div className="auth-remember-row">
            <div className="flex items-center gap-1.5">
              <input type="checkbox" id="remember" className="h-3 w-3 rounded border-slate-500" />
              <span className="text-[0.7rem] cursor-pointer">Se souvenir de moi</span>
            </div>
            <button type="button" className="auth-link-forgot">
              Mot de passe oublié ?
            </button>
          </div>
          <Button type="submit" className="auth-primary-btn" disabled={loading}>
            {loading ? "Connexion..." : "Login"}
          </Button>
        </form>
        <p className="auth-footer">
          Pas encore de compte ?{" "}
          <Link to="/auth/register" className="underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

