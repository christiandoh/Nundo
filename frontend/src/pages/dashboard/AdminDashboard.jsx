import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Users, Shield, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";

const API_BASE = "http://localhost:4000";

const ROLE_LABELS = {
  worker: "Travailleur",
  recruiter: "Recruteur",
  admin: "Administrateur"
};

const ROLE_COLORS = {
  worker: "#009e60",
  recruiter: "#f77f00",
  admin: "#6366f1"
};

export function AdminDashboard() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ byRole: {}, byDay: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Non authentifié.");
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch(`${API_BASE}/api/admin/users`, { headers }).then((r) => {
        if (!r.ok) throw new Error("Accès refusé");
        return r.json();
      }),
      fetch(`${API_BASE}/api/admin/stats`, { headers }).then((r) => {
        if (!r.ok) throw new Error("Accès refusé");
        return r.json();
      })
    ])
      .then(([userList, statsData]) => {
        setUsers(Array.isArray(userList) ? userList : []);
        setStats(statsData || { byRole: {}, byDay: [] });
      })
      .catch((err) => setError(err.message || "Erreur chargement"))
      .finally(() => setLoading(false));
  }, [token]);

  const chartData = (stats.byDay || []).map((d) => ({
    date: typeof d.date === "string" ? d.date.slice(0, 10) : d.date,
    inscriptions: d.count || 0
  }));

  if (loading) {
    return (
      <div className="admin-dashboard-loading">
        <p>Chargement du tableau de bord…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="admin-dashboard-inner"
      >
        <div className="admin-dashboard-header">
          <div>
            <h1 className="admin-dashboard-title">Tableau de bord administrateur</h1>
            <p className="admin-dashboard-subtitle">
              Utilisateurs inscrits et inscriptions sur les 30 derniers jours
            </p>
          </div>
        </div>

        <div className="admin-stats-row">
          <div className="admin-stat-card" style={{ borderColor: "rgba(0,158,96,0.5)" }}>
            <div className="admin-stat-icon" style={{ background: "rgba(0,158,96,0.15)" }}>
              <Users size={20} color="#009e60" />
            </div>
            <div>
              <div className="admin-stat-value">{users.length}</div>
              <div className="admin-stat-label">Utilisateurs</div>
            </div>
          </div>
          <div className="admin-stat-card" style={{ borderColor: "rgba(247,127,0,0.5)" }}>
            <div className="admin-stat-icon" style={{ background: "rgba(247,127,0,0.15)" }}>
              <Shield size={20} color="#f77f00" />
            </div>
            <div>
              <div className="admin-stat-value">
                {(stats.byRole?.worker ?? 0) + (stats.byRole?.recruiter ?? 0)}
              </div>
              <div className="admin-stat-label">Travailleurs + Recruteurs</div>
            </div>
          </div>
          <div className="admin-stat-card" style={{ borderColor: "rgba(99,102,241,0.5)" }}>
            <div className="admin-stat-icon" style={{ background: "rgba(99,102,241,0.15)" }}>
              <TrendingUp size={20} color="#6366f1" />
            </div>
            <div>
              <div className="admin-stat-value">{stats.byRole?.admin ?? 0}</div>
              <div className="admin-stat-label">Admins</div>
            </div>
          </div>
        </div>

        <div className="admin-chart-card">
          <h2 className="admin-chart-title">Inscriptions par jour (30 derniers jours)</h2>
          <div className="admin-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminChartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f77f00" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#009e60" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => (v ? String(v).slice(5) : "")}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(148,163,184,0.3)",
                    borderRadius: 12
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value) => [value, "Inscriptions"]}
                  labelFormatter={(label) => "Date : " + label}
                />
                <Area
                  type="monotone"
                  dataKey="inscriptions"
                  stroke="#f77f00"
                  strokeWidth={2}
                  fill="url(#adminChartGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-table-card">
          <h2 className="admin-table-title">Personnes inscrites</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Téléphone</th>
                  <th>Inscription</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="admin-table-empty">
                      Aucun utilisateur
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="admin-table-name">{u.fullName || "—"}</span>
                      </td>
                      <td>
                        <span
                          className="admin-table-role"
                          style={{
                            background: ROLE_COLORS[u.role]
                              ? `${ROLE_COLORS[u.role]}22`
                              : "rgba(148,163,184,0.2)",
                            color: ROLE_COLORS[u.role] || "#64748b"
                          }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="admin-table-phone">{u.phone}</td>
                      <td className="admin-table-date">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
