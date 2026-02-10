import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, LayoutDashboard, LogOut, Briefcase } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";

const API_BASE = "http://localhost:4000";
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
};

export function MainLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const onAuthPage = location.pathname.startsWith("/auth");
  const { isAuthenticated, user, logout, token } = useAuth();
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      setMessageCount(0);
      return;
    }
    const url = user.role === "worker"
      ? `${API_BASE}/api/applications/me`
      : `${API_BASE}/api/applications`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setMessageCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setMessageCount(0));
  }, [isAuthenticated, user?.id, user?.role, token]);

  function handleLogout() {
    logout();
    navigate("/");
  }

  function goToChat() {
    if (!isAuthenticated) {
      navigate("/auth/login");
      return;
    }
    navigate("/chat");
  }

  return (
    <div className="main-layout">
      <header className="main-nav">
        <div className="main-nav-inner">
          <Link to="/" className="nav-logo">
            <div className="nav-logo-icon" aria-hidden />
            <div>
              <div className="nav-logo-text">NUNDO</div>
              <div className="nav-logo-tagline">Talents locaux, impact réel</div>
            </div>
          </Link>

          <nav className="nav-links">
            {(!isAuthenticated || user?.role === "worker") && (
              <Link to="/jobs" className="nav-link">
                <Briefcase size={16} strokeWidth={2} />
                Trouver une mission
              </Link>
            )}
            <button
              type="button"
              onClick={goToChat}
              className="nav-link nav-link-btn"
              aria-label={messageCount > 0 ? `${messageCount} conversation${messageCount > 1 ? "s" : ""}` : "Messages"}
            >
              <span className="nav-badge-wrap">
                <MessageCircle size={16} strokeWidth={2} />
                {messageCount > 0 && (
                  <span className="nav-badge">
                    {messageCount > 99 ? "99+" : messageCount}
                  </span>
                )}
              </span>
              <span>Messages</span>
            </button>
          </nav>

          {!onAuthPage && !isAuthenticated && (
            <div className="nav-actions">
              <Link to="/auth/login" className="btn-ghost">
                Se connecter
              </Link>
              <Link to="/auth/register" className="btn-primary">
                Créer un compte
              </Link>
            </div>
          )}
          {!onAuthPage && isAuthenticated && (
            <div className="nav-actions">
              {user?.role === "worker" && (
                <Link to="/dashboard/worker" className="nav-dashboard-link">
                  <LayoutDashboard size={16} strokeWidth={2} />
                  Mon espace
                </Link>
              )}
              {user?.role === "recruiter" && (
                <Link to="/dashboard/recruiter" className="nav-dashboard-link">
                  <LayoutDashboard size={16} strokeWidth={2} />
                  Mon espace
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="nav-logout"
                aria-label="Déconnexion"
              >
                <LogOut size={16} strokeWidth={2} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      <motion.main
        className={`main-content${onAuthPage ? " auth-page" : ""}`}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div>{children}</div>
      </motion.main>

      <footer className="main-footer">
        NUNDO · Plateforme de mise en relation en Côte d&apos;Ivoire · © {new Date().getFullYear()}
      </footer>
    </div>
  );
}

