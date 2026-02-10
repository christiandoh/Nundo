import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, LockKeyhole, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";

export function RegisterPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("worker");
  const [fullName, setFullName] = useState("");
  const [mainSkill, setMainSkill] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { saveAuth } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
          role,
          fullName: role === "worker" ? fullName : undefined,
          mainSkill: role === "worker" ? mainSkill : undefined,
          experienceYears: role === "worker" ? experienceYears : undefined,
          city: role === "worker" ? city : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Impossible de créer le compte.");
      }
      if (data.token && data.user) {
        saveAuth(data.token, data.user);
        navigate(data.user.role === "recruiter" ? "/dashboard/recruiter" : "/dashboard/worker");
      } else {
        navigate("/auth/login");
      }
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
          <span className="text-xs font-semibold tracking-[0.18em] uppercase">NUNDO</span>
        </div>
        <div className="auth-title">Créer un compte</div>
        <p className="auth-subtitle">
          Travailleurs et recruteurs, créez votre compte NUNDO en quelques secondes.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <span className="auth-field-icon">
              <User size={14} />
            </span>
            <select
              id="register-role"
              className="auth-select-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="worker">Je suis un travailleur</option>
              <option value="recruiter">Je suis un recruteur</option>
            </select>
          </div>
          {role === "worker" && (
            <>
              <div className="auth-field">
                <Input
                  className="auth-field-input"
                  placeholder="Nom complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <Input
                  className="auth-field-input"
                  placeholder="Métier principal (ex: Chauffeur, Serveuse, Vigile...)"
                  value={mainSkill}
                  onChange={(e) => setMainSkill(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <Input
                  className="auth-field-input"
                  placeholder="Années d'expérience (ex: 3)"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <Input
                  className="auth-field-input"
                  placeholder="Ville / commune (ex: Abobo, Cocody...)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="auth-field">
            <span className="auth-field-icon">
              <Phone size={14} />
            </span>
            <Input
              id="register-phone"
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
              id="register-password"
              type="password"
              className="auth-field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-400 mb-1">{error}</p>}
          <Button type="submit" className="auth-primary-btn" disabled={loading}>
            {loading ? "Création..." : "Continuer"}
          </Button>
        </form>
        <p className="auth-footer">
          Déjà un compte ?{" "}
          <Link to="/auth/login" className="underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

