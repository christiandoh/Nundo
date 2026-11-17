import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { Users, X } from "lucide-react";
import { API_BASE } from "@/lib/api.js";

const MAX_POSTULANTS = 10;

export function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [closedMessage, setClosedMessage] = useState("");
  const [modalMaxReached, setModalMaxReached] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/${id}`);
        const data = await res.json();
        if (res.status === 410) {
          setClosedMessage(data.message || "Cette annonce n'est plus disponible.");
          setJob(null);
          return;
        }
        if (!res.ok) {
          throw new Error(data.message || "Impossible de charger la mission.");
        }
        setJob(data);
      } catch (err) {
        setFeedback(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "worker" || !token) return;
    fetch(`${API_BASE}/api/applications/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          setAlreadyApplied(list.some((app) => Number(app.jobId) === Number(id)));
        }
      })
      .catch(() => {});
  }, [id, isAuthenticated, user?.role, token]);

  async function handleApply(e) {
    e.preventDefault();
    setFeedback("");
    if (!isAuthenticated || user?.role !== "worker") {
      navigate("/auth/login");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          jobId: Number(id),
          workerId: user.id,
          message,
          workerName: user.profile?.fullName || "",
          workerMainSkill: user.profile?.mainSkill || "",
          workerAvatarUrl: user.profile?.avatarUrl || null
        })
      });
      const data = await res.json();
      if (res.status === 403 && data.message && data.message.includes("Maximum 10")) {
        setModalMaxReached(true);
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Impossible d'envoyer ta candidature.");
      }
      setFeedback("Ta candidature a bien été envoyée.");
      setMessage("");
      setAlreadyApplied(true);
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p style={{ fontSize: 13, color: "#6b7280" }}>Chargement de la mission…</p>;
  }

  if (closedMessage) {
    return (
      <div className="job-closed-message">
        <p style={{ fontSize: 15, color: "#64748b", marginBottom: 12 }}>{closedMessage}</p>
        <button type="button" className="btn-primary" onClick={() => navigate("/jobs")}>
          Voir les autres missions
        </button>
      </div>
    );
  }

  if (!job) {
    return <p style={{ fontSize: 13, color: "#b91c1c" }}>{feedback || "Mission introuvable."}</p>;
  }

  const postulantsCount = job.applicationsCount ?? 0;
  const isFull = postulantsCount >= MAX_POSTULANTS;

  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(260px, 0.9fr)",
        gap: "2.2rem",
        alignItems: "flex-start"
      }}
    >
      <div>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: 11,
            color: "#6b7280",
            marginBottom: 6
          }}
        >
          Détails de la mission
        </p>
        <h1
          style={{
            fontSize: "1.8rem",
            fontWeight: 600,
            margin: 0,
            marginBottom: 6
          }}
        >
          {job.title}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#4b5563",
            margin: 0,
            marginBottom: 6
          }}
        >
          {job.location} · {job.salary} CFA / mois · {job.contractType || "Type non précisé"}
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
            padding: "0.35rem 0.75rem",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            background: isFull ? "rgba(245,158,11,0.12)" : "rgba(0,158,96,0.08)",
            color: isFull ? "#b45309" : "#047857"
          }}
        >
          <Users size={14} />
          {postulantsCount} postulant{postulantsCount !== 1 ? "s" : ""} · {isFull ? "Plus de place (max 10)" : "Il reste de la place, postule !"}
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 13,
            color: "#374151",
            lineHeight: 1.7
          }}
        >
          <p style={{ marginBottom: 8 }}>
            {job.description ||
              "Le recruteur n'a pas encore renseigné de description détaillée pour cette mission."}
          </p>
          <p style={{ fontWeight: 500, marginTop: 16 }}>Conditions générales (exemple MVP)</p>
          <ul style={{ paddingLeft: "1.1rem", marginTop: 4 }}>
            <li>Horaires à convenir avec le recruteur.</li>
            <li>Paiement sécurisé via Mobile Money (Orange, MTN, Wave) après validation.</li>
            <li>Badge vérifié requis pour les missions de longue durée.</li>
          </ul>
        </div>
      </div>

      <aside
        style={{
          borderRadius: 22,
          padding: "1.3rem 1.2rem 1.4rem",
          background:
            "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          color: "#e5e7eb",
          boxShadow: "0 22px 50px rgba(15,23,42,0.85)"
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            margin: 0,
            marginBottom: 6
          }}
        >
          Candidater à cette mission
        </h2>
        <p
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 10
          }}
        >
          Ton message sera envoyé au recruteur une fois ta candidature envoyée.
        </p>
        <form onSubmit={handleApply} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, marginBottom: 2 }}>
            Message au recruteur (optionnel)
          </label>
          <textarea
            rows={4}
            style={{
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.7)",
              padding: "0.55rem 0.65rem",
              fontSize: 12,
              background:
                "linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.98))",
              color: "#e5e7eb"
            }}
            placeholder="Présente-toi rapidement, précise ton expérience et ta disponibilité."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {feedback && (
            <p
              style={{
                fontSize: 11,
                color: feedback.includes("bien") ? "#4ade80" : feedback.includes("déjà") ? "#fcd34d" : "#fecaca",
                marginTop: 4
              }}
            >
              {feedback}
            </p>
          )}
          {alreadyApplied ? (
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
              Tu as déjà postulé. Va dans{" "}
              <button
                type="button"
                style={{ color: "#38bdf8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                onClick={() => navigate("/chat")}
              >
                Messages
              </button>{" "}
              pour échanger avec le recruteur.
            </p>
          ) : (
            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 6, fontSize: 12 }}
              disabled={submitting || isFull}
            >
              {submitting ? "Envoi en cours..." : isFull ? "Nombre de postulants atteint (max 10)" : "Postuler à cette mission"}
            </button>
          )}
        </form>
      </aside>

      {modalMaxReached && (
        <div className="job-modal-overlay" onClick={() => setModalMaxReached(false)} role="dialog" aria-modal="true" aria-labelledby="modal-max-title">
          <div className="job-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="job-modal-close" onClick={() => setModalMaxReached(false)} aria-label="Fermer">
              <X size={20} />
            </button>
            <h3 id="modal-max-title" className="job-modal-title">Nombre de postulants atteint</h3>
            <p className="job-modal-text">
              Pour ce poste, le maximum de 10 candidatures a été atteint. Merci pour votre compréhension.
            </p>
            <p className="job-modal-sub">Nous vous invitons à consulter les autres missions disponibles.</p>
            <button type="button" className="btn-primary" onClick={() => setModalMaxReached(false)}>
              Compris
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

