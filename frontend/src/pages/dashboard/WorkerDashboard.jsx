import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Briefcase, MapPin, Clock, Pencil, X, Camera, ChevronRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";
import { API_BASE } from "@/lib/api.js";

const SKILLS = [
  "Chauffeur", "Servante / Aide ménagère", "Cuisinier(ère)", "Vigile / Agent de sécurité",
  "Jardinier(ère)", "Nourrice / Baby-sitter", "Plombier(ère)", "Électricien(ne)",
  "Maçon(ne)", "Menuisier(ère)", "Mécanicien(ne)", "Coiffeur(se)", "Autre",
];

function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function profileCompleteness(profile) {
  const fields = ["fullName", "mainSkill", "experienceYears", "city", "avatarUrl", "bio"];
  const done = fields.filter((f) => profile[f] && String(profile[f]).trim() !== "").length;
  return Math.round((done / fields.length) * 100);
}

export function WorkerDashboard() {
  const { user, token, saveAuth } = useAuth();
  const navigate = useNavigate();
  const profile = user?.profile || {};
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({
    fullName: profile.fullName || "",
    mainSkill: profile.mainSkill || "",
    experienceYears: profile.experienceYears || "",
    city: profile.city || "",
    avatarUrl: profile.avatarUrl || "",
    bio: profile.bio || "",
  });
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  const completeness = profileCompleteness(profile);

  useEffect(() => {
    if (!token || !user) return;
    const headers = { Authorization: `Bearer ${token}` };
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/applications/me`, { headers });
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setApplications(data);
      } catch {
        // silencieux
      }
    })();
    return () => { cancelled = true; };
  }, [token, user]);

  useEffect(() => {
    if (!user?.id) return;
    const socket = io(API_BASE.replace(/\/$/, ""), { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join_user", { userId: user.id });
    socket.on("application_accepted", async () => {
      try {
        const res = await fetch(`${API_BASE}/api/applications/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) setApplications(data);
      } catch {
        // silencieux
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((f) => ({ ...f, avatarUrl: reader.result?.toString() || "" }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    setError("");
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Impossible de mettre à jour le profil.");
      saveAuth(token, { ...(user || {}), profile: data.profile });
      setEdit(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const avatarSrc = form.avatarUrl || profile.avatarUrl;

  return (
    <div className="worker-shell">
      <div className="worker-glass">

        {/* ── Profile header ── */}
        <div className="worker-profile-header">
          <div className="worker-avatar-wrap">
            {avatarSrc ? (
              <img src={avatarSrc} alt={profile.fullName || "Avatar"} className="worker-avatar-img" />
            ) : (
              <div className="worker-avatar-placeholder">
                {getInitials(profile.fullName)}
              </div>
            )}
          </div>

          <div className="worker-profile-info">
            <p className="worker-profile-kicker">Profil travailleur</p>
            <h1 className="worker-header-name">
              {profile.fullName || "Ton profil NUNDO"}
            </h1>
            <div className="worker-badges-row">
              {profile.mainSkill && (
                <span className="worker-badge worker-badge-skill">
                  <Briefcase size={11} />
                  {profile.mainSkill}
                </span>
              )}
              {profile.city && (
                <span className="worker-badge worker-badge-city">
                  <MapPin size={11} />
                  {profile.city}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            className={`worker-edit-toggle ${edit ? "worker-edit-toggle-close" : ""}`}
            onClick={() => setEdit((v) => !v)}
          >
            {edit ? <X size={14} /> : <Pencil size={14} />}
            {edit ? "Fermer" : "Modifier"}
          </button>
        </div>

        <p className="worker-header-sub">
          Ce profil sera visible par les recruteurs lorsque tu postuleras à une mission.
        </p>

        {profile.bio && (
          <p className="worker-bio">{profile.bio}</p>
        )}

        {/* ── Stats row ── */}
        <div className="worker-stats-row">
          <div className="worker-stat-card">
            <span className="worker-stat-icon-wrap">
              <Clock size={15} />
            </span>
            <div>
              <p className="worker-stat-label">Expérience</p>
              <p className="worker-stat-value">
                {profile.experienceYears ? `${profile.experienceYears} ans` : "—"}
              </p>
            </div>
          </div>

          <div className="worker-stat-card">
            <span className="worker-stat-icon-wrap">
              <MapPin size={15} />
            </span>
            <div>
              <p className="worker-stat-label">Zone</p>
              <p className="worker-stat-value">{profile.city || "—"}</p>
            </div>
          </div>

          <div className="worker-stat-card worker-stat-completion">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="worker-completion-header">
                <p className="worker-stat-label">Profil complété</p>
                <p className="worker-completion-pct">{completeness}%</p>
              </div>
              <div className="worker-completion-track">
                <div
                  className="worker-completion-fill"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="worker-completion-hint">
                {completeness === 100 ? (
                  <><CheckCircle2 size={11} style={{ display: "inline", marginRight: 4, color: "#047857" }} />Profil prêt à être présenté</>
                ) : (
                  "Complète ton profil pour inspirer confiance"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ── Applications ── */}
        {applications.length > 0 && (
          <div className="worker-applications">
            <p className="worker-applications-title">Mes candidatures</p>
            <div className="worker-applications-list">
              {applications.map((app) => (
                <div key={app.id} className="worker-app-row">
                  <div className="worker-app-info">
                    <p className="worker-app-job">
                      {app.jobTitle || `Mission #${app.jobId}`}
                    </p>
                    <span className={`worker-app-status ${app.status === "accepted" ? "accepted" : "pending"}`}>
                      {app.status === "accepted" ? "Acceptée" : "En attente"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="worker-app-chat-btn"
                    onClick={() => navigate(`/chat?applicationId=${app.id}&jobId=${app.jobId}`)}
                  >
                    {app.status === "accepted" ? "Conversation" : "Contacter"}
                    <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Edit form ── */}
        {edit && (
          <form onSubmit={handleSave} className="worker-edit-card">
            <div className="worker-edit-title">
              <Pencil size={14} />
              Mettre à jour ton profil
            </div>

            <div className="worker-edit-grid">
              {/* Full name */}
              <div className="worker-edit-field">
                <label className="worker-edit-label">Nom complet</label>
                <input
                  className="worker-edit-input"
                  placeholder="Ex : Konan Aya Marie"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>

              {/* Skill */}
              <div className="worker-edit-field">
                <label className="worker-edit-label">Métier principal</label>
                <select
                  className="worker-edit-input worker-edit-select"
                  value={form.mainSkill}
                  onChange={(e) => setForm((f) => ({ ...f, mainSkill: e.target.value }))}
                >
                  <option value="">-- Choisir --</option>
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  {form.mainSkill && !SKILLS.includes(form.mainSkill) && (
                    <option value={form.mainSkill}>{form.mainSkill}</option>
                  )}
                </select>
              </div>

              {/* Experience */}
              <div className="worker-edit-field">
                <label className="worker-edit-label">Années d&apos;expérience</label>
                <input
                  className="worker-edit-input"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="Ex : 3"
                  value={form.experienceYears}
                  onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
                />
              </div>

              {/* City */}
              <div className="worker-edit-field">
                <label className="worker-edit-label">Ville / commune</label>
                <input
                  className="worker-edit-input"
                  placeholder="Ex : Abobo, Cocody, Yopougon…"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>

              {/* Bio */}
              <div className="worker-edit-field worker-edit-field-full">
                <label className="worker-edit-label">À propos de toi</label>
                <textarea
                  className="worker-edit-input worker-edit-textarea"
                  placeholder="Décris ton parcours, tes qualités, ta disponibilité…"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>

              {/* Avatar */}
              <div className="worker-edit-field worker-edit-field-full">
                <label className="worker-edit-label">Photo de profil</label>
                <div className="worker-avatar-upload-row">
                  <div className="worker-avatar-preview-wrap">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Prévisualisation" className="worker-avatar-preview" />
                    ) : (
                      <div className="worker-avatar-preview-placeholder">
                        {getInitials(form.fullName)}
                      </div>
                    )}
                  </div>
                  <label className="worker-avatar-upload-btn">
                    <Camera size={13} />
                    Choisir une photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      style={{ display: "none" }}
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarSrc && (
                    <button
                      type="button"
                      className="worker-avatar-remove-btn"
                      onClick={() => setForm((f) => ({ ...f, avatarUrl: "" }))}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && <p className="worker-edit-error">{error}</p>}

            <div className="worker-edit-actions">
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 12, padding: "0.45rem 1.1rem" }}
                onClick={() => setEdit(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: 12, padding: "0.45rem 1.3rem" }}
                disabled={saving}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
