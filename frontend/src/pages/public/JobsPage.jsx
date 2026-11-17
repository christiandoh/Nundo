import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "@/lib/api.js";

export function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs`);
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
    load();
  }, []);

  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.8rem"
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
          Missions disponibles
        </p>
        <h1
          style={{
            fontSize: "1.7rem",
            fontWeight: 600,
            margin: 0,
            marginBottom: 6
          }}
        >
          Trouve une mission près de chez toi.
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "#4b5563",
            maxWidth: 520
          }}
        >
          Parcours les missions publiées par les recruteurs NUNDO : chauffeur, servante,
          gérant de bar, vigile, secrétaire, commercial…
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: "#6b7280" }}>Chargement des missions…</p>
      ) : jobs.length === 0 ? (
        <p style={{ fontSize: 12, color: "#6b7280" }}>
          Aucune mission disponible pour le moment. Reviens un peu plus tard.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.4rem"
          }}
        >
          {jobs.map((job) => (
            <article
              key={job.id}
              className="card"
              style={{
                borderRadius: 22,
                padding: "1.2rem 1.25rem 1.3rem",
                background:
                  "radial-gradient(circle at top left, rgba(247,127,0,0.14), transparent 55%), radial-gradient(circle at bottom right, rgba(0,158,96,0.12), transparent 55%), linear-gradient(135deg,#ffffff,#f9fafb)",
                border: "1px solid rgba(148,163,184,0.45)",
                boxShadow: "0 16px 40px rgba(15,23,42,0.08)"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      margin: 0,
                      marginBottom: 3
                    }}
                  >
                    {job.title}
                  </h2>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      margin: 0
                    }}
                  >
                    {job.location}
                  </p>
                </div>
                <span
                  style={{
                    padding: "0.18rem 0.6rem",
                    borderRadius: 999,
                    fontSize: 11,
                    background: (job.applicationsCount || 0) >= 10 ? "rgba(245,158,11,0.15)" : "rgba(0,158,96,0.06)",
                    color: (job.applicationsCount || 0) >= 10 ? "#b45309" : "#047857",
                    border: (job.applicationsCount || 0) >= 10 ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(16,185,129,0.35)"
                  }}
                >
                  {job.applicationsCount != null
                    ? `${job.applicationsCount} postulant${job.applicationsCount !== 1 ? "s" : ""}`
                    : "Nouveau"}
                </span>
              </div>

              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: 6,
                  color: "#111827"
                }}
              >
                {job.salary} CFA / mois
              </p>

              {job.description && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#4b5563",
                    margin: 0,
                    marginBottom: 10
                  }}
                >
                  {job.description}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 4
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#6b7280"
                  }}
                >
                  Type: {job.contractType || "Non précisé"}
                </span>
                <button
                  className="btn-primary"
                  style={{ fontSize: 11, padding: "0.45rem 1.1rem" }}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  Voir la mission
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

