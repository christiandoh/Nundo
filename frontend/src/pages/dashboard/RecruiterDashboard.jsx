import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Users, CheckCircle2 } from "lucide-react";
import { API_BASE } from "@/lib/api.js";

export function RecruiterDashboard() {
  const { user, token, saveAuth } = useAuth();
  const navigate = useNavigate();
  const profile = user?.profile || {};
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    location: "",
    salary: "",
    contractType: "",
    description: ""
  });
  const [formError, setFormError] = useState("");
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    avatarUrl: "",
    profession: "",
    bio: ""
  });
  const socketRef = useRef(null);

  // Synchroniser le formulaire profil avec le profil utilisateur
  useEffect(() => {
    setProfileForm({
      fullName: profile.fullName ?? "",
      phone: profile.phone ?? user?.phone ?? "",
      avatarUrl: profile.avatarUrl ?? "",
      profession: profile.profession ?? "",
      bio: profile.bio ?? ""
    });
  }, [user?.phone, profile.fullName, profile.phone, profile.avatarUrl, profile.profession, profile.bio, profileEdit]);

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/recruiter/me`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setJobs(data);
        }
      } catch {
        // silencieux pour le MVP
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    async function loadApplications() {
      try {
        const res = await fetch(`${API_BASE}/api/applications`, { headers });
        const data = await res.json();
        if (Array.isArray(data)) {
          setApplications(data);
        }
      } catch {
        // silencieux
      }
    }
    loadApplications();
  }, [token]);

  // Temps réel : nouvelle candidature reçue quand un travailleur postule
  useEffect(() => {
    if (!user || user?.role !== "recruiter") return;
    const socket = io(API_BASE.replace(/\/$/, ""), { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join_recruiters");
    socket.on("new_application", async () => {
      try {
        const res = await fetch(`${API_BASE}/api/applications`, { headers });
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
  }, [user?.id, user?.role, token]);

  const displayName = profile.fullName || (user?.phone ? `#${user.phone.slice(-8)}` : "recruteur");

  function handleRecruiterAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result?.toString() || "";
      setProfileForm((f) => ({ ...f, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!user) return;
    setProfileError("");
    try {
      setProfileSaving(true);
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          id: user.id,
          fullName: profileForm.fullName || null,
          phone: profileForm.phone || null,
          avatarUrl: profileForm.avatarUrl || null,
          profession: profileForm.profession || null,
          bio: profileForm.bio || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Impossible de mettre à jour le profil.");
      saveAuth(token, { ...user, profile: data.profile });
      setProfileEdit(false);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePublish(e) {
    e.preventDefault();
    setFormError("");
    if (!form.title || !form.location || !form.salary) {
      setFormError("Titre, lieu et salaire sont obligatoires.");
      return;
    }
    try {
      setPublishing(true);
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Impossible de publier la mission.");
      }
      setJobs((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({
        title: "",
        location: "",
        salary: "",
        contractType: "",
        description: ""
      });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="recruiter-shell">
      <div className="recruiter-glass">
        {(profileForm.avatarUrl || profile.avatarUrl) && (
          <img
            src={profileForm.avatarUrl || profile.avatarUrl}
            alt={profile.fullName || "Photo de profil"}
            className="recruiter-profile-avatar"
          />
        )}
        <div className="recruiter-header-kicker">Tableau de bord recruteur</div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
          <div>
            <div className="recruiter-header-title">
              Bonjour, <span style={{ color: "#f77f00" }}>{displayName}</span>
            </div>
            <p className="recruiter-header-sub">
              Centralise tes missions, suis les candidatures et valide tes placements en toute
              transparence, aux couleurs de la Côte d&apos;Ivoire.
            </p>
            {profile.profession && (
              <div className="recruiter-profile-profession">
                <Briefcase size={14} style={{ flexShrink: 0 }} />
                <span>{profile.profession}</span>
              </div>
            )}
            {profile.bio && !profileEdit && (
              <p className="recruiter-profile-bio">{profile.bio}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11, padding: "0.45rem 1rem" }}
              onClick={() => setProfileEdit((v) => !v)}
            >
              {profileEdit ? "Fermer l'édition" : "Modifier le profil"}
            </button>
          </div>
        </div>

        {profileEdit && (
          <form onSubmit={handleSaveProfile} className="recruiter-profile-form">
            <div className="recruiter-profile-form-title">Ton profil recruteur</div>
            <div className="recruiter-profile-form-grid">
              <div>
                <label className="recruiter-profile-label">Nom</label>
                <input
                  type="text"
                  className="recruiter-profile-input"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Ton nom ou prénom"
                />
              </div>
              <div>
                <label className="recruiter-profile-label">Numéro de téléphone</label>
                <input
                  type="tel"
                  className="recruiter-profile-input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+225 07 00 00 00 00"
                />
              </div>
              <div>
                <label className="recruiter-profile-label">Profession</label>
                <input
                  type="text"
                  className="recruiter-profile-input"
                  value={profileForm.profession}
                  onChange={(e) => setProfileForm((f) => ({ ...f, profession: e.target.value }))}
                  placeholder="Ex. Responsable RH, Chef d'entreprise"
                />
              </div>
              <div className="recruiter-profile-form-photo">
                <label className="recruiter-profile-label">Photo</label>
                <div className="flex items-center gap-2">
                  {(profileForm.avatarUrl || profile.avatarUrl) && (
                    <img
                      src={profileForm.avatarUrl || profile.avatarUrl}
                      alt="Prévisualisation"
                      className="recruiter-profile-preview"
                    />
                  )}
                  <label className="btn-ghost recruiter-profile-upload-btn">
                    Choisir une photo
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleRecruiterAvatarChange}
                    />
                  </label>
                </div>
              </div>
              <div className="recruiter-profile-form-bio">
                <label className="recruiter-profile-label">Présentation / détail sur toi</label>
                <textarea
                  className="recruiter-profile-textarea"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Quelques lignes pour te présenter aux travailleurs..."
                  rows={4}
                />
              </div>
            </div>
            {profileError && (
              <p className="recruiter-profile-error">{profileError}</p>
            )}
            <div className="recruiter-profile-form-actions">
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "0.4rem 1rem" }}
                onClick={() => setProfileEdit(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: 11, padding: "0.4rem 1.2rem" }}
                disabled={profileSaving}
              >
                {profileSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        )}

        <div className="recruiter-stats-row">
          <div className="recruiter-stat-card">
            <div>
              <div className="recruiter-stat-label">Annonces actives</div>
              <div className="recruiter-stat-value">{jobs.length}</div>
            </div>
            <div className="recruiter-stat-icon" style={{ border: "1px solid rgba(247,127,0,0.7)" }}>
              <Briefcase size={18} color="#f77f00" />
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div>
              <div className="recruiter-stat-label">Candidatures reçues</div>
              <div className="recruiter-stat-value">{applications.length}</div>
            </div>
            <div className="recruiter-stat-icon" style={{ border: "1px solid rgba(34,197,94,0.7)" }}>
              <Users size={18} color="#4ade80" />
            </div>
          </div>
          <div className="recruiter-stat-card">
            <div>
              <div className="recruiter-stat-label">Placements confirmés</div>
              <div className="recruiter-stat-value">{applications.filter((app) => app.status === "accepted").length}</div>
            </div>
            <div className="recruiter-stat-icon" style={{ border: "1px solid rgba(56,189,248,0.7)" }}>
              <CheckCircle2 size={18} color="#38bdf8" />
            </div>
          </div>
        </div>

        <div className="recruiter-jobs-card">
          <div className="recruiter-jobs-header">
            <div>
              <div className="recruiter-jobs-title">Mes annonces</div>
              <div className="recruiter-jobs-sub">
                Récapitulatif de tes offres publiées auprès des talents NUNDO.
              </div>
            </div>
            <Button
              size="sm"
              className="btn-primary"
              style={{ fontSize: 11, padding: "0.55rem 1.4rem" }}
              onClick={() => setShowForm(true)}
            >
              Publier une mission
            </Button>
          </div>

          {loading ? (
            <p className="recruiter-jobs-sub">Chargement de tes annonces...</p>
          ) : jobs.length === 0 ? (
            <p className="recruiter-jobs-sub">
              Tu n&apos;as pas encore publié de mission. Commence par créer ta première annonce.
            </p>
          ) : (
            <div className="recruiter-jobs-list">
              {jobs.map((job) => {
                const jobApps = applications.filter((app) => app.jobId === job.id);
                const isClosed = job.status === "closed";
                const count = job.applicationsCount ?? jobApps.length;
                return (
                  <div
                    key={job.id}
                    className="recruiter-job-row"
                    onClick={() =>
                      setSelectedJobId((current) => (current === job.id ? null : job.id))
                    }
                    style={{ cursor: "pointer", opacity: isClosed ? 0.85 : 1 }}
                  >
                    <div>
                      <div className="recruiter-job-title">{job.title}</div>
                      <div className="recruiter-job-meta">
                        {job.location} · {job.salary} CFA / mois
                      </div>
                      <div className="recruiter-job-meta" style={{ marginTop: 4 }}>
                        {count} postulant{count !== 1 ? "s" : ""}
                        {jobApps.length > 0 && (
                          <> · {jobApps.slice(0, 2).map((a) => a.workerName || `Travailleur #${a.workerId}`).join(" · ")}
                            {jobApps.length > 2 && " · ..."}
                          </>
                        )}
                      </div>
                    </div>
                    <span className="recruiter-job-status">
                      {isClosed ? "Pourvue" : jobApps.length > 0 ? "Candidatures en attente" : "Ouverte"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedJobId && (
        <div style={{ marginTop: "1.8rem" }}>
          <div
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "#6b7280",
              marginBottom: 4
            }}
          >
            Candidatures pour cette mission
          </div>
          <div
            style={{
              borderRadius: 22,
              padding: "1.1rem 1.2rem 1.2rem",
              background:
                "linear-gradient(135deg,rgba(15,23,42,0.99),rgba(15,23,42,0.96))",
              color: "#e5e7eb",
              boxShadow: "0 22px 55px rgba(15,23,42,0.88)",
              border: "1px solid rgba(148,163,184,0.6)"
            }}
          >
            {(() => {
              const job = jobs.find((j) => j.id === selectedJobId);
              const jobApps = applications.filter((a) => a.jobId === selectedJobId);
              if (!job) {
                return <p className="recruiter-jobs-sub">Mission introuvable.</p>;
              }
              if (jobApps.length === 0) {
                return (
                  <p className="recruiter-jobs-sub">
                    Aucune candidature pour cette mission pour le moment.
                  </p>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                  {jobApps.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "0.7rem 0.75rem",
                        borderRadius: 14,
                        background:
                          "radial-gradient(circle at top left,rgba(15,23,42,0.95),rgba(15,23,42,0.98))",
                        border: "1px solid rgba(148,163,184,0.6)"
                      }}
                    >
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {app.workerName || `Travailleur #${app.workerId}`}
                        </div>
                        {app.workerMainSkill && (
                          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {app.workerMainSkill}
                          </div>
                        )}
                        {app.message && (
                          <p
                            style={{
                              fontSize: 11,
                              color: "#d1d5db",
                              marginTop: 6,
                              marginBottom: 0
                            }}
                          >
                            “{app.message.length > 120
                              ? `${app.message.slice(0, 117)}...`
                              : app.message}”
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "0.2rem 0.6rem",
                            borderRadius: 999,
                            border: "1px solid rgba(249,250,251,0.3)"
                          }}
                        >
                          En attente
                        </span>
                        <Button
                          size="sm"
                          className="btn-primary"
                          style={{ fontSize: 10, padding: "0.35rem 0.8rem" }}
                          onClick={() =>
                            navigate(
                              `/chat?applicationId=${app.id}&jobId=${job.id}`
                            )
                          }
                        >
                          Contacter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showForm && (
        <div className="recruiter-modal-overlay">
          <div className="recruiter-modal-card">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full border border-slate-500 flex items-center justify-center text-[0.65rem]">
                <Briefcase size={14} />
              </div>
              <div>
                <div className="recruiter-modal-title">Nouvelle mission</div>
                <p className="recruiter-modal-sub">
                  Décris rapidement le poste, le lieu et le salaire. Tu pourras affiner plus tard.
                </p>
              </div>
            </div>
            <form onSubmit={handlePublish} className="space-y-3">
              <div>
                <span className="recruiter-modal-label">Titre</span>
                <Input
                  className="recruiter-modal-input"
                  placeholder="Ex: Chauffeur privé, Serveuse de bar..."
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <span className="recruiter-modal-label">Lieu</span>
                <Input
                  className="recruiter-modal-input"
                  placeholder="Commune / Quartier"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <span className="recruiter-modal-label">Salaire (CFA)</span>
                  <Input
                    className="recruiter-modal-input"
                    placeholder="Ex: 250000"
                    value={form.salary}
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <span className="recruiter-modal-label">Type de contrat</span>
                  <Input
                    className="recruiter-modal-input"
                    placeholder="CDI, CDD, Journalier..."
                    value={form.contractType}
                    onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <span className="recruiter-modal-label">Description courte</span>
                <Textarea
                  className="recruiter-modal-textarea"
                  rows={3}
                  placeholder="Précise l'horaire, les tâches principales et les avantages."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              {formError && <p className="text-[0.7rem] text-red-400">{formError}</p>}
              <div className="recruiter-modal-actions">
                <Button
                  type="button"
                  className="h-8 px-3 rounded-full border border-slate-600 bg-transparent text-xs text-slate-200 hover:bg-slate-800/60"
                  onClick={() => setShowForm(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="h-8 px-5 rounded-full bg-gradient-to-r from-[#f77f00] via-[#ff9f1c] to-[#009e60] text-xs font-semibold tracking-[0.12em] text-white shadow-[0_14px_32px_rgba(0,0,0,0.6)] hover:brightness-105"
                  disabled={publishing}
                >
                  {publishing ? "Publication..." : "Publier"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


