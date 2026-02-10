import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, LayoutDashboard, LogOut, Briefcase, Mail } from "lucide-react";
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
        <div className="main-footer-inner">
          <span className="main-footer-copyright">
            NUNDO · Plateforme de mise en relation en Côte d&apos;Ivoire · © {new Date().getFullYear()}
          </span>
          <div className="main-footer-contact">
            <a
              href="https://wa.me/2250711118582"
              target="_blank"
              rel="noopener noreferrer"
              className="main-footer-link"
              aria-label="Nous contacter sur WhatsApp : +225 07 11 11 85 82"
            >
              <span className="main-footer-icon main-footer-icon-whatsapp" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </span>
              <span>+225 07 11 11 85 82</span>
            </a>
            <a
              href="mailto:christiandoh29@gmail.com"
              className="main-footer-link"
              aria-label="Nous contacter par email : christiandoh29@gmail.com"
            >
              <Mail size={18} strokeWidth={2} />
              <span>christiandoh29@gmail.com</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

