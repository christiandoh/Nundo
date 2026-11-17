import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import "./styles/global.css";
import "./styles/variables.css";
import "./styles/components.css";
import { MainLayout } from "./components/layout/MainLayout.jsx";
import { HomePage } from "./pages/public/HomePage.jsx";
import { JobsPage } from "./pages/public/JobsPage.jsx";
import { JobDetailsPage } from "./pages/public/JobDetailsPage.jsx";
import { LoginPage } from "./pages/auth/LoginPage.jsx";
import { RegisterPage } from "./pages/auth/RegisterPage.jsx";
import { WorkerDashboard } from "./pages/dashboard/WorkerDashboard.jsx";
import { RecruiterDashboard } from "./pages/dashboard/RecruiterDashboard.jsx";
import { CandidatesPage } from "./pages/dashboard/CandidatesPage.jsx";
import { AdminDashboard } from "./pages/dashboard/AdminDashboard.jsx";
import { ChatPage } from "./pages/dashboard/ChatPage.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Chargement...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route
            path="/dashboard/worker"
            element={
              <PrivateRoute roles={["worker"]}>
                <WorkerDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/recruiter"
            element={
              <PrivateRoute roles={["recruiter"]}>
                <RecruiterDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/candidates"
            element={
              <PrivateRoute roles={["recruiter"]}>
                <CandidatesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <PrivateRoute roles={["admin"]}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute roles={["recruiter", "worker"]}>
                <ChatPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </MainLayout>
    </AnimatePresence>
  );
}

