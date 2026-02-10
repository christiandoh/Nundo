import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext.jsx";

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
    avatarUrl: profile.avatarUrl || ""
  });
  const [error, setError] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token || !user) return;
    const headers = { Authorization: `Bearer ${token}` };
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("http://localhost:4000/api/applications/me", { headers });
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
    const socket = io("http://localhost:4000", { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join_user", { userId: user.id });
    socket.on("application_accepted", async () => {
      try {
        const res = await fetch("http://localhost:4000/api/applications/me", {
          headers: { Authorization: `Bearer ${token}` }
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
      const dataUrl = reader.result?.toString() || "";
      setForm((f) => ({ ...f, avatarUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;
    setError("");
    try {
      setSaving(true);
      const res = await fetch("http://localhost:4000/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: user.id,
          ...form
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Impossible de mettre à jour le profil.");
      }
      const updatedUser = { ...(user || {}), profile: data.profile };
      saveAuth(token, updatedUser);
      setEdit(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="worker-shell">
      <div className="worker-glass">
        {(form.avatarUrl || profile.avatarUrl) && (
          <img
            src={form.avatarUrl || profile.avatarUrl}
            alt={profile.fullName || "Photo de profil"}
            style={{
              position: "absolute",
              top: 18,
              right: 20,
              width: 150,
              height: 150,
              borderRadius: "999px",
              objectFit: "cover",
              border: "2px solid rgba(248, 250, 252,0.95)",
              boxShadow: "0 18px 40px rgba(15,23,42,0.35)"
            }}
          />
        )}
        <p className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500 mb-1">
          Profil travailleur
        </p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="worker-header-name">
              {profile.fullName || "Ton profil NUNDO"}
            </h1>
            <p className="worker-header-sub">
              Ce profil sera visible par les recruteurs lorsque tu postuleras à une mission.
            </p>
            {profile.mainSkill && (
              <div className="worker-badge-skill">
                <span>✅</span>
                <span>{profile.mainSkill}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 11, padding: "0.45rem 1rem" }}
              onClick={() => setEdit((v) => !v)}
            >
              {edit ? "Fermer l'édition" : "Modifier le profil"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 text-sm mt-2">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-500">
              Expérience
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {profile.experienceYears ? `${profile.experienceYears} ans` : "À renseigner"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-slate-500">
              Zone
            </p>
            <p className="mt-1 font-semibold text-slate-900">
              {profile.city || "À renseigner"}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-emerald-700">
              Statut du profil
            </p>
            <p className="mt-1 font-semibold text-emerald-800">
              {profile.fullName && profile.mainSkill && profile.city
                ? "Profil prêt à être présenté"
                : "Complète ton profil pour inspirer confiance"}
            </p>
          </div>
        </div>

        {applications.length > 0 && (
          <div className="mt-6">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-slate-500 mb-2">
              Mes candidatures
            </p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {app.jobTitle || `Mission #${app.jobId}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {app.status === "accepted" ? "Acceptée" : "En attente"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-xs py-1.5 px-2"
                    onClick={() =>
                      navigate(`/chat?applicationId=${app.id}&jobId=${app.jobId}`)
                    }
                  >
                    {app.status === "accepted" ? "Voir la conversation" : "Contacter"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {edit && (
          <form onSubmit={handleSave} className="worker-edit-card">
            <div className="worker-edit-title">Mettre à jour ton profil</div>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="worker-edit-label">Nom complet</span>
                <input
                  className="worker-edit-input"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div>
                <span className="worker-edit-label">Métier principal</span>
                <input
                  className="worker-edit-input"
                  value={form.mainSkill}
                  onChange={(e) => setForm((f) => ({ ...f, mainSkill: e.target.value }))}
                />
              </div>
              <div>
                <span className="worker-edit-label">Années d&apos;expérience</span>
                <input
                  className="worker-edit-input"
                  value={form.experienceYears}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, experienceYears: e.target.value }))
                  }
                />
              </div>
              <div>
                <span className="worker-edit-label">Ville / commune</span>
                <input
                  className="worker-edit-input"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <span className="worker-edit-label">Photo de profil</span>
                <div className="flex items-center gap-2">
                  {(form.avatarUrl || profile.avatarUrl) && (
                    <img
                      src={form.avatarUrl || profile.avatarUrl}
                      alt="Prévisualisation"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "999px",
                        objectFit: "cover",
                        border: "2px solid rgba(148,163,184,0.8)"
                      }}
                    />
                  )}
                  <label
                    className="btn-ghost"
                    style={{
                      fontSize: 11,
                      padding: "0.4rem 0.9rem",
                      cursor: "pointer"
                    }}
                  >
                    Choisir une photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      style={{ display: "none" }}
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
              </div>
            </div>
            {error && (
              <p className="text-[0.7rem] text-red-500 mt-2">{error}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 11, padding: "0.4rem 1rem" }}
                onClick={() => setEdit(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: 11, padding: "0.4rem 1.2rem" }}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

