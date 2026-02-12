import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Trash2, Pencil, X, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";

const API_BASE = "http://localhost:4000";

export function ChatPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const applicationIdParam = params.get("applicationId");
  const applicationId = applicationIdParam ? Number(applicationIdParam) : null;
  const jobId = params.get("jobId");
  const { user, token } = useAuth();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const [application, setApplication] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [sendingIds, setSendingIds] = useState(new Set());
  const [conversations, setConversations] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [profileLightbox, setProfileLightbox] = useState(null); // { avatarUrl, name }
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [workerFetchedAvatarUrl, setWorkerFetchedAvatarUrl] = useState(null);
  const [recruiterFetchedAvatarUrl, setRecruiterFetchedAvatarUrl] = useState(null);
  const [recruiterFetchedName, setRecruiterFetchedName] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentIntentLoading, setPaymentIntentLoading] = useState(false);
  const [paymentIntentError, setPaymentIntentError] = useState("");
  const [deleteConfirmApp, setDeleteConfirmApp] = useState(null); // { id, jobId, label } ou null
  const [deleteLoading, setDeleteLoading] = useState(false);

  const role = user?.role === "worker" ? "worker" : "recruiter";
  const counterpartAvatarUrl =
    role === "recruiter"
      ? (application?.workerAvatarUrl ??
         application?.worker_avatar_url ??
         workerFetchedAvatarUrl ??
         null)
      : (application?.recruiterAvatarUrl ??
         application?.recruiter_avatar_url ??
         recruiterFetchedAvatarUrl ??
         null);
  const counterpartName =
    role === "recruiter"
      ? application?.workerName || `Travailleur #${application?.workerId || "?"}`
      : (application?.recruiterName ?? application?.recruiter_name ?? recruiterFetchedName ?? "Recruteur");

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Inbox: list of conversations when on /chat without applicationId (Messages tab)
  useEffect(() => {
    if (applicationId || !token || !user) return;
    setInboxLoading(true);
    let cancelled = false;
    const url = role === "worker"
      ? `${API_BASE}/api/applications/me`
      : `${API_BASE}/api/applications`;
    fetch(url, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setConversations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setInboxLoading(false);
      });
    return () => { cancelled = true; };
  }, [applicationId, token, user, role]);

  // Load one conversation + its messages (only when applicationId is set)
  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    let cancelled = false;
    (async () => {
      try {
        const [appRes, msgRes] = await Promise.all([
          fetch(`${API_BASE}/api/applications/${applicationId}`, { headers }),
          fetch(`${API_BASE}/api/applications/${applicationId}/messages`, { headers })
        ]);
        const appData = await appRes.json();
        const msgsData = await msgRes.json();
        if (cancelled) return;
        if (!appRes.ok) {
          setLoadError(appData.message || "Impossible de charger la conversation.");
          return;
        }
        setApplication(appData);
        setMessages(Array.isArray(msgsData) ? msgsData : []);
      } catch (e) {
        if (!cancelled) setLoadError("Erreur de connexion. Réessaie.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applicationId, token]);

  // Réinitialiser l’erreur avatar quand on change de conversation
  useEffect(() => {
    setAvatarImgError(false);
  }, [applicationId]);

  // Si la candidature n’a pas d’avatar stocké, récupérer le profil public du travailleur (anciennes candidatures)
  useEffect(() => {
    if (role !== "recruiter" || !application?.workerId || !token) return;
    const stored = application?.workerAvatarUrl ?? application?.worker_avatar_url;
    if (stored) {
      setWorkerFetchedAvatarUrl(null);
      return;
    }
    let cancelled = false;
    fetch(`${API_BASE}/api/users/${application.workerId}/profile`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.avatarUrl) setWorkerFetchedAvatarUrl(data.avatarUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setWorkerFetchedAvatarUrl(null);
    };
  }, [role, application?.workerId, application?.workerAvatarUrl, application?.worker_avatar_url, token]);

  // Pour le travailleur : récupérer le profil public du recruteur (nom + photo) si non présent dans la candidature
  useEffect(() => {
    if (role !== "worker" || !application?.recruiterId || !token) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/users/${application.recruiterId}/profile`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.fullName) setRecruiterFetchedName(data.fullName);
        if (data?.avatarUrl) setRecruiterFetchedAvatarUrl(data.avatarUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      setRecruiterFetchedAvatarUrl(null);
      setRecruiterFetchedName(null);
    };
  }, [role, application?.recruiterId, token]);

  // Scroll en bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Socket : temps réel + notification acceptation
  useEffect(() => {
    if (!applicationId) return;
    const socket = io(API_BASE.replace(/\/$/, ""), { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join_application", { applicationId });
    if (user?.id) socket.emit("join_user", { userId: user.id });
    socket.on("new_message", (message) => {
      if (!message || message.id == null) return;
      // Ne pas ajouter nos propres messages reçus par socket (déjà ajoutés via resolveOptimistic)
      if (message.from === role) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    });
    socket.on("application_accepted", ({ applicationId: id, application: app }) => {
      if (id === applicationId && app) {
        setApplication((prev) => (prev ? { ...prev, status: "accepted" } : app));
      }
    });
    socket.on("message_deleted", ({ applicationId: id, messageId: mid, message: deletedMessage }) => {
      if (id === applicationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === mid ? (deletedMessage || { ...m, deletedAt: new Date().toISOString() }) : m
          )
        );
      }
    });
    socket.on("message_updated", ({ applicationId: id, message: updated }) => {
      if (id === applicationId && updated?.id != null) {
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMessageId(null);
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [applicationId, user?.id]);

  // Envoi un message (texte ou pièce jointe) ; en cas d'échec lance une erreur
  async function sendMessageToApi(text, type = "text", attachmentName = null, attachmentData = null) {
    const res = await fetch(
      `${API_BASE}/api/applications/${applicationId}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          from: role,
          text,
          type,
          attachmentName: attachmentName ?? null,
          attachmentData: attachmentData ?? null
        })
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Envoi impossible.");
    return data;
  }

  function addOptimisticMessage(text, type = "text", attachmentName = null, attachmentData = null) {
    const tempId = Date.now();
    const temp = {
      id: tempId,
      from: role,
      text,
      type,
      attachmentName: attachmentName ?? null,
      attachmentData: attachmentData ?? null,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, temp]);
    setSendingIds((prev) => new Set(prev).add(tempId));
    return tempId;
  }

  function resolveOptimistic(tempId, serverMessage) {
    setSendingIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? serverMessage : m))
    );
    return serverMessage;
  }

  function failOptimistic(tempId) {
    setSendingIds((prev) => {
      const next = new Set(prev);
      next.delete(tempId);
      return next;
    });
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !applicationId) return;
    setInput("");
    setSendError("");
    const tempId = addOptimisticMessage(text);
    try {
      const data = await sendMessageToApi(text);
      resolveOptimistic(tempId, data);
      if (socketRef.current) {
        socketRef.current.emit("message_created", {
          applicationId,
          message: data
        });
      }
    } catch (err) {
      failOptimistic(tempId);
      setSendError(err.message || "Échec de l'envoi. Réessaie.");
    }
  }

  async function sendAttachment(file) {
    if (!applicationId || !file) return;
    setSendError("");
    const text = `Photo envoyée: ${file.name}`;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const tempId = addOptimisticMessage(text, "photo", file.name, dataUrl);
      sendMessageToApi(text, "photo", file.name, dataUrl)
        .then((data) => {
          resolveOptimistic(tempId, data);
          if (socketRef.current) {
            socketRef.current.emit("message_created", {
              applicationId,
              message: data
            });
          }
        })
        .catch((err) => {
          failOptimistic(tempId);
          setSendError(err.message || "Échec d'envoi de la pièce jointe. Réessaie.");
        });
    };
    reader.readAsDataURL(file);
  }

  async function deleteMessage(msg) {
    if (!applicationId || isTempId(msg.id)) return;
    if (!window.confirm("Supprimer ce message pour tout le monde ?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/applications/${applicationId}/messages/${msg.id}`,
        { method: "DELETE", headers }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? data : m)));
      }
    } catch {
      setSendError("Impossible de supprimer le message.");
    }
  }

  const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  function isWithinEditWindow(createdAt) {
    if (!createdAt) return false;
    const t = new Date(createdAt).getTime();
    return Date.now() - t <= EDIT_WINDOW_MS;
  }

  async function saveEditMessage(msg) {
    if (!applicationId || editingMessageId !== msg.id || isTempId(msg.id)) return;
    const text = editingText.trim();
    if (!text) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/applications/${applicationId}/messages/${msg.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ text })
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? data : m)));
        setEditingMessageId(null);
      } else if (res.status === 403) {
        setSendError(data.message || "Le délai de modification est dépassé (15 minutes).");
      } else {
        setSendError(data.message || "Impossible de modifier le message.");
      }
    } catch {
      setSendError("Impossible de modifier le message.");
    }
  }

  function openPaymentModal() {
    setPaymentIntentError("");
    setPaymentModalOpen(true);
  }

  async function confirmDeleteConversation() {
    if (!deleteConfirmApp?.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/applications/${deleteConfirmApp.id}`, {
        method: "DELETE",
        headers
      });
      if (res.status === 204 || res.ok) {
        setConversations((prev) => prev.filter((a) => a.id !== deleteConfirmApp.id));
        setDeleteConfirmApp(null);
        if (applicationId === deleteConfirmApp.id) {
          navigate("/chat");
        }
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Impossible de supprimer la discussion.");
      }
    } catch {
      alert("Erreur de connexion. Réessayez.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handlePayWithMobileMoney() {
    if (!applicationId) return;
    setPaymentIntentError("");
    setPaymentIntentLoading(true);
    try {
      const payRes = await fetch(`${API_BASE}/api/payments/intent`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId })
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        setPaymentIntentError(payData.message || "Impossible de créer le paiement.");
        return;
      }
      if (payData.paymentUrl) {
        window.location.href = payData.paymentUrl;
        return;
      }
      setPaymentIntentError(
        "Lien de paiement non disponible. Configurez l'agrégateur (adullam.dev) côté serveur, ou réessayez plus tard."
      );
    } catch {
      setPaymentIntentError("Erreur de connexion. Réessayez.");
    } finally {
      setPaymentIntentLoading(false);
    }
  }

  const isTempId = (id) => typeof id === "number" && id > 1e12;

  if (loading) {
    return (
      <section className="chat-shell">
        <div className="chat-glass">
          <p className="chat-subtitle">Chargement de la conversation…</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="chat-shell">
        <div className="chat-glass">
          <p className="chat-subtitle" style={{ color: "#f87171" }}>
            {loadError}
          </p>
        </div>
      </section>
    );
  }

  // Messages tab without a conversation selected: show inbox (all conversations)
  if (!applicationId) {
    return (
      <section className="chat-shell">
        <div className="chat-glass chat-inbox-glass">
          <h2 className="chat-inbox-title">Messages</h2>
          <p className="chat-subtitle" style={{ marginBottom: "1rem" }}>
            {role === "recruiter"
              ? "Tes candidatures et conversations avec les travailleurs."
              : "Tes candidatures et conversations avec les recruteurs."}
          </p>
          {inboxLoading ? (
            <p className="chat-subtitle">Chargement des conversations…</p>
          ) : conversations.length === 0 ? (
            <p className="chat-subtitle">
              Aucune conversation.{" "}
              {role === "worker"
                ? "Postule à une mission pour échanger avec un recruteur."
                : "Les candidatures apparaîtront ici quand des travailleurs postuleront."}
            </p>
          ) : (
            <ul className="chat-inbox-list">
              {conversations.map((app) => (
                <li key={app.id} className="chat-inbox-item-row">
                  <button
                    type="button"
                    className="chat-inbox-item"
                    onClick={() =>
                      navigate(`/chat?applicationId=${app.id}&jobId=${app.jobId}`)
                    }
                  >
                    <span className="chat-inbox-item-title">
                      {role === "recruiter"
                        ? app.workerName || `Travailleur #${app.workerId}`
                        : app.jobTitle || `Mission #${app.jobId}`}
                    </span>
                    <span className="chat-inbox-item-meta">
                      {role === "recruiter"
                        ? `Mission #${app.jobId} · ${app.status === "accepted" ? "Accepté" : "En attente"}`
                        : `Mission #${app.jobId} · ${app.status === "accepted" ? "Accepté" : "En attente"}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="chat-inbox-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmApp({
                        id: app.id,
                        jobId: app.jobId,
                        label: role === "recruiter"
                          ? (app.workerName || `Travailleur #${app.workerId}`)
                          : (app.jobTitle || `Mission #${app.jobId}`)
                      });
                    }}
                    title="Supprimer la discussion"
                    aria-label="Supprimer la discussion"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {deleteConfirmApp && (
          <>
            <div
              className="chat-delete-overlay"
              onClick={() => !deleteLoading && setDeleteConfirmApp(null)}
              aria-hidden="true"
            />
            <div className="chat-delete-modal-box" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
              <h2 id="delete-modal-title" className="chat-delete-modal-title">Supprimer cette discussion ?</h2>
              <p className="chat-delete-modal-desc">
                Tous les messages seront définitivement supprimés. Cette action est irréversible.
              </p>
              <div className="chat-delete-modal-footer">
                <button
                  type="button"
                  className="chat-payment-modal-cancel"
                  onClick={() => !deleteLoading && setDeleteConfirmApp(null)}
                  disabled={deleteLoading}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="chat-delete-modal-confirm"
                  onClick={confirmDeleteConversation}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <section className={`chat-shell${paymentModalOpen ? " chat-shell-payment-open" : ""}`}>
      <div className="chat-glass">
        <header className="chat-header">
          <button
            type="button"
            className="chat-back-inbox"
            onClick={() => navigate("/chat")}
            aria-label="Retour aux conversations"
          >
            ← Messages
          </button>
          <div className="chat-header-left">
            {counterpartAvatarUrl && !avatarImgError ? (
              <button
                type="button"
                className="chat-avatar chat-avatar-clickable"
                onClick={() => setProfileLightbox({ avatarUrl: counterpartAvatarUrl, name: counterpartName })}
                title="Voir la photo en grand"
                aria-label="Voir la photo de profil en grand"
              >
                <img
                  src={counterpartAvatarUrl}
                  alt={counterpartName}
                  className="chat-avatar-img"
                  onError={() => setAvatarImgError(true)}
                />
              </button>
            ) : (
              <div className="chat-avatar">
                {counterpartName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
            <div>
              <div className="chat-name">{counterpartName}</div>
              <div className="chat-subtitle">
                Mission #{jobId} · {application?.workerMainSkill || "Métier non précisé"}
              </div>
            </div>
          </div>
          <div className="chat-header-actions">
            {role === "recruiter" && (
              <button
                type="button"
                className="chat-accept-button"
                disabled={application?.status === "accepted"}
                onClick={openPaymentModal}
              >
                {application?.status === "accepted"
                  ? "Candidat accepté"
                  : "Accepter ce candidat"}
              </button>
            )}
            {role === "worker" && application?.status === "accepted" && (
              <span className="chat-accept-button" style={{ opacity: 1, cursor: "default" }}>
                ✓ Le recruteur vous a accepté
              </span>
            )}
            <button
              type="button"
              className="chat-header-delete"
              onClick={() =>
                setDeleteConfirmApp({
                  id: applicationId,
                  jobId,
                  label: counterpartName
                })
              }
              title="Supprimer la discussion"
              aria-label="Supprimer la discussion"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <p className="chat-subtitle">
              {role === "recruiter"
                ? "Commence la conversation avec ce travailleur."
                : "Commence la conversation avec le recruteur."}
            </p>
          ) : (
            messages.map((msg) => {
              const isDeleted = !!(msg.deletedAt ?? msg.deleted_at);
              const isEdited = !!(msg.updatedAt ?? msg.updated_at);
              const canEdit = msg.from === role && !isTempId(msg.id) && msg.type !== "photo" && isWithinEditWindow(msg.createdAt) && !isDeleted;
              return (
              <div
                key={isTempId(msg.id) ? `temp-${msg.id}` : msg.id}
                className={
                  "chat-message-row " + (msg.from === role ? "self" : "other")
                }
              >
                <div
                  className={
                    "chat-bubble " + (msg.from === role ? "self" : "other") + (isDeleted ? " chat-bubble-deleted" : "")
                  }
                >
                  {isDeleted ? (
                    <div className="chat-message-deleted">Message supprimé</div>
                  ) : editingMessageId === msg.id && msg.from === role && msg.type !== "photo" ? (
                    <div className="chat-edit-form">
                      <textarea
                        className="chat-edit-input"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={3}
                      />
                      <div className="chat-edit-actions">
                        <button
                          type="button"
                          className="chat-edit-btn"
                          onClick={() => { setEditingMessageId(null); setEditingText(""); }}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="chat-edit-btn chat-edit-save"
                          onClick={() => saveEditMessage(msg)}
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  ) : msg.type === "photo" ? (
                    <div className="chat-bubble-attachment chat-image-blurred">
                      {(msg.attachmentData ?? msg.attachment_data) ? (
                        <button
                          type="button"
                          className="chat-image-wrap"
                          onClick={() => setLightboxImage(msg.attachmentData ?? msg.attachment_data)}
                        >
                          <img
                            src={msg.attachmentData ?? msg.attachment_data}
                            alt={msg.attachmentName || msg.text}
                            className="chat-message-image"
                          />
                        </button>
                      ) : (
                        <>
                          <span className="chat-attachment-icon">📷</span>
                          <span>{msg.attachmentName || msg.text}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div>{msg.text}</div>
                  )}
                  {!isDeleted && (
                    <div className="chat-bubble-meta">
                      {msg.from === role ? "Vous" : counterpartName}
                      {sendingIds.has(msg.id) && (
                        <span className="chat-sending-label"> · Envoi…</span>
                      )}
                      {isEdited && (
                        <span className="chat-message-modified"> · Message modifié</span>
                      )}
                      {canEdit && editingMessageId !== msg.id && (
                        <span className="chat-bubble-actions">
                          {msg.type !== "photo" && (
                            <button
                              type="button"
                              className="chat-action-btn"
                              onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }}
                              title="Modifier"
                              aria-label="Modifier"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="chat-action-btn"
                            onClick={() => deleteMessage(msg)}
                            title="Supprimer"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {sendError && (
          <p className="chat-send-error" role="alert">
            {sendError}
          </p>
        )}

        <form onSubmit={sendMessage} className="chat-input-bar">
          <button
            type="button"
            className="chat-icon-button"
            title="Insérer un emoji"
            onClick={() => setInput((v) => v + " 🙂")}
          >
            🙂
          </button>
          <label className="chat-icon-button" title="Envoyer une photo" style={{ cursor: "pointer" }}>
            📎
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendAttachment(file);
                e.target.value = "";
              }}
            />
          </label>
          <input
            className="chat-input"
            placeholder={
              role === "recruiter"
                ? "Écris un message au travailleur…"
                : "Écris un message au recruteur…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ padding: "0.4rem 0.9rem" }}
            disabled={!input.trim()}
          >
            Envoyer
          </button>
        </form>
      </div>

      {paymentModalOpen && (
        <>
          <div
            className="chat-payment-overlay"
            onClick={() => { setPaymentModalOpen(false); setPaymentIntentError(""); }}
            aria-hidden="true"
          />
          <div
            className="chat-payment-modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <button
              type="button"
              className="chat-payment-modal-close"
              onClick={() => { setPaymentModalOpen(false); setPaymentIntentError(""); }}
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
            <div className="chat-payment-modal-inner">
              <h2 id="payment-modal-title" className="chat-payment-modal-title">
                <ShieldCheck size={22} style={{ verticalAlign: "middle", marginRight: 8 }} />
                Confirmer ce candidat par paiement sécurisé
              </h2>
              <div className="chat-payment-modal-desc">
                <p>
                  Pour valider ce placement, le montant (salaire 1er mois + commission NUNDO) sera déposé sur un <strong>compte marchand sécurisé</strong>.
                </p>
                <p>
                  Vous pourrez récupérer les fonds si vous ne souhaitez plus ce candidat avant la fin de la période d'essai.
                </p>
                <p>
                  En cliquant sur « Payer », vous serez redirigé vers votre <strong>Mobile Money</strong> (Orange Money, MTN ou Wave) pour effectuer le paiement. Le candidat ne sera marqué accepté qu'après réception du paiement.
                </p>
              </div>
              {paymentIntentError && (
                <p className="chat-payment-modal-error" role="alert">
                  {paymentIntentError}
                </p>
              )}
              <div className="chat-payment-modal-footer">
                <button
                  type="button"
                  className="chat-payment-modal-cancel"
                  onClick={() => setPaymentModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="chat-payment-modal-pay"
                  disabled={paymentIntentLoading}
                  onClick={handlePayWithMobileMoney}
                >
                  {paymentIntentLoading ? "Redirection..." : "Payer avec Mobile Money"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {deleteConfirmApp && (
        <>
          <div
            className="chat-delete-overlay"
            onClick={() => !deleteLoading && setDeleteConfirmApp(null)}
            aria-hidden="true"
          />
          <div className="chat-delete-modal-box" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <h2 id="delete-modal-title" className="chat-delete-modal-title">Supprimer cette discussion ?</h2>
            <p className="chat-delete-modal-desc">
              Tous les messages seront définitivement supprimés. Cette action est irréversible.
            </p>
            <div className="chat-delete-modal-footer">
              <button
                type="button"
                className="chat-payment-modal-cancel"
                onClick={() => !deleteLoading && setDeleteConfirmApp(null)}
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                className="chat-delete-modal-confirm"
                onClick={confirmDeleteConversation}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </>
      )}

      {lightboxImage && (
        <div
          className="chat-lightbox"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-label="Image en grand"
        >
          <button
            type="button"
            className="chat-lightbox-close"
            onClick={() => setLightboxImage(null)}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="chat-lightbox-img"
          />
        </div>
      )}

      {profileLightbox && (
        <div
          className="chat-lightbox chat-lightbox-profile"
          onClick={() => setProfileLightbox(null)}
          role="dialog"
          aria-label="Photo de profil en grand"
        >
          <button
            type="button"
            className="chat-lightbox-close"
            onClick={() => setProfileLightbox(null)}
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
          <div className="chat-lightbox-profile-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={profileLightbox.avatarUrl}
              alt={profileLightbox.name}
              className="chat-lightbox-profile-img"
            />
            <p className="chat-lightbox-profile-name">{profileLightbox.name}</p>
          </div>
        </div>
      )}
    </section>
  );
}
