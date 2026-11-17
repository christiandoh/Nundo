import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { Users, MessageCircle, Briefcase, ChevronRight, UserCircle, Search } from "lucide-react";
import { API_BASE } from "@/lib/api.js";

export function CandidatesPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("job");
  const [searchQuery, setSearchQuery] = useState("");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const [workersRes, appRes, jobsRes] = await Promise.all([
          fetch(`${API_BASE}/api/users/workers`, { headers }),
          fetch(`${API_BASE}/api/applications`, { headers }),
          fetch(`${API_BASE}/api/jobs/recruiter/me`, { headers })
        ]);
        const workersData = await workersRes.json();
        const appData = await appRes.json();
        const jobsData = await jobsRes.json();
        setWorkers(Array.isArray(workersData) ? workersData : []);
        setApplications(Array.isArray(appData) ? appData : []);
        setJobs(Array.isArray(jobsData) ? jobsData : []);
      } catch {
        setWorkers([]);
        setApplications([]);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const getJobTitle = (jobId) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.title || `Mission #${jobId}`;
  };

  const applicantWorkerIds = applications.map((a) => a.workerId);

  const q = (searchQuery || "").trim().toLowerCase();
  const filteredWorkers = q
    ? workers.filter((w) => {
        const skill = (w.mainSkill || "").toLowerCase();
        const exp = String(w.experienceYears ?? "").toLowerCase();
        const name = (w.fullName || "").toLowerCase();
        const city = (w.city || "").toLowerCase();
        return (
          skill.includes(q) ||
          exp.includes(q) ||
          name.includes(q) ||
          city.includes(q)
        );
      })
    : workers;

  const filtered = applications.filter((app) => {
    if (filter === "pending") return app.status !== "accepted";
    if (filter === "accepted") return app.status === "accepted";
    return true;
  });

  const groupedByJob = filtered.reduce((acc, app) => {
    const key = app.jobId ?? "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(app);
    return acc;
  }, {});

  function goToChat(applicationId, jobId) {
    navigate(`/chat?applicationId=${applicationId}&jobId=${jobId}`);
  }

  const initials = (name) => {
    if (!name || !name.trim()) return "?";
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="recruiter-shell candidates-page-shell">
      <div className="recruiter-glass candidates-page-glass">
        <div className="candidates-page-header">
          <div className="candidates-page-header-left">
            <div className="candidates-page-icon-wrap">
              <Users size={22} strokeWidth={2} />
            </div>
            <div>
              <h1 className="candidates-page-title">Candidats & talents</h1>
              <p className="candidates-page-sub">
                Consulte tous les travailleurs inscrits sur NUNDO et ceux qui ont postulé à tes
                missions.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1 : Tous les travailleurs inscrits */}
        <section className="candidates-section">
          <div className="candidates-section-header">
            <UserCircle size={20} strokeWidth={2} className="candidates-section-icon" />
            <div>
              <h2 className="candidates-section-title">Tous les travailleurs inscrits</h2>
              <p className="candidates-section-sub">
                {workers.length} travailleur{workers.length !== 1 ? "s" : ""} sur la plateforme
                {searchQuery.trim() && ` · ${filteredWorkers.length} résultat${filteredWorkers.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="candidates-search-wrap">
            <Search size={18} strokeWidth={2} className="candidates-search-icon" />
            <input
              type="search"
              className="candidates-search-input"
              placeholder="Rechercher par compétence, années d'expérience, nom ou ville…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Rechercher les travailleurs"
            />
          </div>
          {loading ? (
            <p className="candidates-page-empty">Chargement…</p>
          ) : workers.length === 0 ? (
            <div className="candidates-page-empty-wrap candidates-section-empty">
              <UserCircle size={36} strokeWidth={1.5} className="candidates-page-empty-icon" />
              <p className="candidates-page-empty">
                Aucun travailleur inscrit pour le moment.
              </p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="candidates-page-empty-wrap candidates-section-empty">
              <Search size={36} strokeWidth={1.5} className="candidates-page-empty-icon" />
              <p className="candidates-page-empty">
                Aucun résultat pour « {searchQuery.trim()} ». Modifie ta recherche.
              </p>
            </div>
          ) : (
            <div className="candidates-scroll-area candidates-scroll-workers">
              <div className="candidates-workers-grid">
              {filteredWorkers.map((w) => (
                <div key={w.id} className="candidates-worker-card">
                  <div className="candidates-page-avatar candidates-worker-avatar">
                    {w.avatarUrl ? (
                      <img
                        src={w.avatarUrl}
                        alt={w.fullName || "Travailleur"}
                        className="candidates-page-avatar-img"
                      />
                    ) : (
                      <span className="candidates-page-avatar-initials">
                        {initials(w.fullName)}
                      </span>
                    )}
                  </div>
                  <div className="candidates-worker-card-info">
                    <div className="candidates-page-name">{w.fullName || `Travailleur #${w.id}`}</div>
                    {w.mainSkill && (
                      <span className="candidates-page-skill-badge">{w.mainSkill}</span>
                    )}
                    <div className="candidates-worker-meta">
                      {w.city && <span>{w.city}</span>}
                      {w.experienceYears && (
                        <span>{w.experienceYears} an{w.experienceYears !== "1" ? "s" : ""} d&apos;exp.</span>
                      )}
                    </div>
                    {applicantWorkerIds.includes(w.id) ? (
                      <span className="candidates-worker-badge applicants">A postulé à une de tes offres</span>
                    ) : (
                      <span className="candidates-worker-badge">Inscrit sur NUNDO</span>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </section>

        {/* Section 2 : Postulants à tes missions */}
        <section className="candidates-section">
          <div className="candidates-section-header">
            <Briefcase size={20} strokeWidth={2} className="candidates-section-icon" />
            <div>
              <h2 className="candidates-section-title">Postulants à tes missions</h2>
              <p className="candidates-section-sub">
                Candidatures reçues pour tes annonces. Clique pour ouvrir la conversation.
              </p>
            </div>
          </div>

          <div className="candidates-page-filters">
            <div className="candidates-page-filter-group">
              <span className="candidates-page-filter-label">Statut</span>
              <div className="candidates-page-filter-btns">
                {[
                  { value: "all", label: "Tous" },
                  { value: "pending", label: "En attente" },
                  { value: "accepted", label: "Acceptés" }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`candidates-page-filter-btn ${filter === value ? "active" : ""}`}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="candidates-page-filter-group">
              <span className="candidates-page-filter-label">Affichage</span>
              <div className="candidates-page-filter-btns">
                <button
                  type="button"
                  className={`candidates-page-filter-btn ${groupBy === "job" ? "active" : ""}`}
                  onClick={() => setGroupBy("job")}
                >
                  Par mission
                </button>
                <button
                  type="button"
                  className={`candidates-page-filter-btn ${groupBy === "list" ? "active" : ""}`}
                  onClick={() => setGroupBy("list")}
                >
                  Liste plate
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="candidates-page-empty">Chargement des candidatures…</p>
          ) : filtered.length === 0 ? (
            <div className="candidates-page-empty-wrap candidates-section-empty">
              <Briefcase size={36} strokeWidth={1.5} className="candidates-page-empty-icon" />
              <p className="candidates-page-empty">
                {applications.length === 0
                  ? "Aucune candidature pour le moment. Elles apparaîtront ici quand des travailleurs postuleront à tes missions."
                  : "Aucun candidat ne correspond à ce filtre."}
              </p>
            </div>
          ) : groupBy === "job" ? (
            <div className="candidates-scroll-area candidates-scroll-applications">
            <div className="candidates-page-groups">
              {Object.entries(groupedByJob).map(([jobId, apps]) => (
                <div key={jobId} className="candidates-page-group">
                  <div className="candidates-page-group-title">
                    <Briefcase size={16} strokeWidth={2} />
                    <span>{getJobTitle(Number(jobId))}</span>
                    <span className="candidates-page-group-count">
                      {apps.length} candidat{apps.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="candidates-page-list">
                    {apps.map((app) => (
                      <div
                        key={app.id}
                        className="candidates-page-row"
                        onClick={() => goToChat(app.id, app.jobId)}
                      >
                        <div className="candidates-page-avatar">
                          {app.workerAvatarUrl ? (
                            <img
                              src={app.workerAvatarUrl}
                              alt={app.workerName || "Candidat"}
                              className="candidates-page-avatar-img"
                            />
                          ) : (
                            <span className="candidates-page-avatar-initials">
                              {initials(app.workerName)}
                            </span>
                          )}
                        </div>
                        <div className="candidates-page-info">
                          <div className="candidates-page-name">
                            {app.workerName || `Travailleur #${app.workerId}`}
                          </div>
                          {app.workerMainSkill && (
                            <div className="candidates-page-skill">
                              <span className="candidates-page-skill-badge">
                                {app.workerMainSkill}
                              </span>
                            </div>
                          )}
                          {app.message && (
                            <p className="candidates-page-message">
                              {app.message.length > 80
                                ? `${app.message.slice(0, 80)}…`
                                : app.message}
                            </p>
                          )}
                          <div className="candidates-page-meta">
                            <span
                              className={`candidates-page-status candidates-page-status-${app.status}`}
                            >
                              {app.status === "accepted" ? "Accepté" : "En attente"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="candidates-page-contact-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToChat(app.id, app.jobId);
                          }}
                          aria-label="Contacter ce candidat"
                        >
                          <MessageCircle size={16} strokeWidth={2} />
                          Contacter
                        </button>
                        <ChevronRight size={18} className="candidates-page-chevron" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
          ) : (
            <div className="candidates-scroll-area candidates-scroll-applications">
            <div className="candidates-page-list candidates-page-list-standalone">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="candidates-page-row"
                  onClick={() => goToChat(app.id, app.jobId)}
                >
                  <div className="candidates-page-avatar">
                    {app.workerAvatarUrl ? (
                      <img
                        src={app.workerAvatarUrl}
                        alt={app.workerName || "Candidat"}
                        className="candidates-page-avatar-img"
                      />
                    ) : (
                      <span className="candidates-page-avatar-initials">
                        {initials(app.workerName)}
                      </span>
                    )}
                  </div>
                  <div className="candidates-page-info">
                    <div className="candidates-page-name">
                      {app.workerName || `Travailleur #${app.workerId}`}
                    </div>
                    <div className="candidates-page-meta">
                      <span className="candidates-page-job-ref">
                        {getJobTitle(app.jobId)}
                      </span>
                      {app.workerMainSkill && (
                        <span className="candidates-page-skill-inline">
                          {app.workerMainSkill}
                        </span>
                      )}
                    </div>
                    {app.message && (
                      <p className="candidates-page-message">
                        {app.message.length > 60
                          ? `${app.message.slice(0, 60)}…`
                          : app.message}
                      </p>
                    )}
                    <span
                      className={`candidates-page-status candidates-page-status-${app.status}`}
                    >
                      {app.status === "accepted" ? "Accepté" : "En attente"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="candidates-page-contact-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToChat(app.id, app.jobId);
                    }}
                    aria-label="Contacter ce candidat"
                  >
                    <MessageCircle size={16} strokeWidth={2} />
                    Contacter
                  </button>
                  <ChevronRight size={18} className="candidates-page-chevron" />
                </div>
              ))}
            </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
