import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { Trash2, Pencil, X, ShieldCheck, Paperclip, FileText, Smile, Mic, Square, Phone, Video, PhoneOff, Send } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "@/context/AuthContext.jsx";

import { API_BASE } from "@/lib/api.js";

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
  const [messageToDelete, setMessageToDelete] = useState(null); // message object when confirming delete
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [callError, setCallError] = useState("");
  const [localMuted, setLocalMuted] = useState(false);
  const peerConnectionRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const waveformRafRef = useRef(null);

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
  const inputRef = useRef(null);
  const emojiPickerWrapRef = useRef(null);

  // Fermer le sélecteur d'emojis au clic à l'extérieur
  useEffect(() => {
    if (!emojiPickerOpen) return;
    function handleClickOutside(e) {
      if (emojiPickerWrapRef.current && !emojiPickerWrapRef.current.contains(e.target)) {
        setEmojiPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiPickerOpen]);

  // Nettoyage enregistrement vocal au démontage
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Oscillogramme en temps réel pendant l'enregistrement
  useEffect(() => {
    if (!isRecording) return;
    const analyser = analyserRef.current;
    const canvas = waveformCanvasRef.current;
    if (!analyser || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dataArray = new Uint8Array(analyser.fftSize);
    const W = canvas.width;
    const H = canvas.height;
    const barCount = Math.min(64, dataArray.length);
    const barWidth = W / barCount;

    function draw() {
      waveformRafRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "rgba(241, 245, 249, 1)";
      ctx.fillRect(0, 0, W, H);
      const step = Math.floor(dataArray.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const v = dataArray[i * step];
        const norm = (v - 128) / 128;
        const h = Math.max(2, (Math.abs(norm) * H) / 2);
        const x = i * barWidth + barWidth * 0.15;
        const y = (H - h) / 2;
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x, y, barWidth * 0.7, h);
      }
    }
    draw();
    return () => {
      if (waveformRafRef.current) cancelAnimationFrame(waveformRafRef.current);
    };
  }, [isRecording]);

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
    socket.on("call:start", ({ type, from }) => {
      setIncomingCall({ type, from });
    });
    socket.on("call:offer", ({ sdp }) => {
      pendingOfferRef.current = sdp;
    });
    socket.on("call:answer", ({ sdp }) => {
      const pc = peerConnectionRef.current;
      if (pc && sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(sdp)).catch((err) => {
          setCallError("Erreur connexion appel.");
        });
      }
    });
    socket.on("call:ice", ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
    });
    socket.on("call:end", () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      pendingOfferRef.current = null;
      setIncomingCall(null);
      setActiveCall(false);
      setCallType(null);
      setCallError("");
    });
    socket.on("call:reject", () => {
      setIncomingCall(null);
      setActiveCall(false);
      setCallType(null);
      setCallError("Appel refusé.");
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

  function isImageFile(file) {
    return file.type.startsWith("image/");
  }

  async function sendAttachment(file) {
    if (!applicationId || !file) return;
    setSendError("");
    const isImage = isImageFile(file);
    const msgType = isImage ? "photo" : "file";
    const text = isImage ? `Photo envoyée: ${file.name}` : `Fichier envoyé: ${file.name}`;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const tempId = addOptimisticMessage(text, msgType, file.name, dataUrl);
      sendMessageToApi(text, msgType, file.name, dataUrl)
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

  const VOICE_MAX_SECONDS = 60;

  async function startRecording() {
    if (!applicationId) return;
    setSendError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const ac = new AudioContextClass();
        const source = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        audioContextRef.current = ac;
        analyserRef.current = analyser;
      }
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= VOICE_MAX_SECONDS - 1) {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
            stopRecording();
            return VOICE_MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err) {
      setSendError("Microphone inaccessible. Autorise l'accès au micro.");
    }
  }

  function stopRecording(send = true) {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      return;
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.onstop = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      analyserRef.current = null;
      if (waveformRafRef.current) {
        cancelAnimationFrame(waveformRafRef.current);
        waveformRafRef.current = null;
      }
      const chunks = audioChunksRef.current;
      if (chunks.length === 0 || !send) {
        setIsRecording(false);
        setRecordingSeconds(0);
        return;
      }
      const blob = new Blob(chunks, { type: "audio/webm" });
      sendVoiceMessage(blob);
      setIsRecording(false);
      setRecordingSeconds(0);
    };
  }

  function cancelRecording() {
    stopRecording(false);
  }

  function toggleVoiceRecording() {
    if (isRecording) stopRecording(true);
    else startRecording();
  }

  async function sendVoiceMessage(blob) {
    if (!applicationId || !blob) return;
    setSendError("");
    const text = "Message vocal";
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const tempId = addOptimisticMessage(text, "voice", "voice.webm", dataUrl);
      sendMessageToApi(text, "voice", "voice.webm", dataUrl)
        .then((data) => {
          resolveOptimistic(tempId, data);
          if (socketRef.current) {
            socketRef.current.emit("message_created", { applicationId, message: data });
          }
        })
        .catch((err) => {
          failOptimistic(tempId);
          setSendError(err.message || "Échec d'envoi du message vocal.");
        });
    };
    reader.readAsDataURL(blob);
  }

  function endCallCleanup() {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    pendingOfferRef.current = null;
    setIncomingCall(null);
    setActiveCall(false);
    setCallType(null);
    setCallError("");
  }

  async function startCall(type) {
    if (!applicationId || !socketRef.current) return;
    setCallError("");
    setCallType(type);
    setIsCallInitiator(true);
    setActiveCall(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(type === "video" ? { video: true, audio: true } : { audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteStreamRef.current = e.streams[0];
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socketRef.current?.emit("call:ice", { applicationId, candidate: e.candidate });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("call:start", { applicationId, type, from: role });
      socketRef.current.emit("call:offer", { applicationId, sdp: offer });
    } catch (err) {
      setCallError("Accès micro/caméra refusé.");
      endCallCleanup();
    }
  }

  async function acceptCall() {
    if (!applicationId || !socketRef.current || !incomingCall) return;
    const type = incomingCall.type;
    setCallError("");
    setIncomingCall(null);
    setCallType(type);
    setIsCallInitiator(false);
    setActiveCall(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(type === "video" ? { video: true, audio: true } : { audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteStreamRef.current = e.streams[0];
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socketRef.current?.emit("call:ice", { applicationId, candidate: e.candidate });
      };
      const offer = pendingOfferRef.current;
      if (!offer) {
        setCallError("Offre d'appel perdue.");
        endCallCleanup();
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit("call:answer", { applicationId, sdp: answer });
    } catch (err) {
      setCallError("Erreur démarrage appel.");
      endCallCleanup();
    }
  }

  function rejectCall() {
    if (socketRef.current && applicationId) socketRef.current.emit("call:reject", { applicationId });
    setIncomingCall(null);
  }

  function endCall() {
    if (socketRef.current && applicationId) socketRef.current.emit("call:end", { applicationId });
    endCallCleanup();
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setLocalMuted((m) => !m);
  }

  async function deleteMessage(msg) {
    if (!applicationId || isTempId(msg.id)) return;
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

  function confirmDeleteMessage() {
    if (!messageToDelete) return;
    const msg = messageToDelete;
    setMessageToDelete(null);
    deleteMessage(msg);
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
      <section className="chat-shell chat-page-shell">
        <div className="chat-glass">
          <p className="chat-subtitle">Chargement de la conversation…</p>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="chat-shell chat-page-shell">
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
      <section className="chat-shell chat-page-shell">
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
    <section className={`chat-shell chat-page-shell${paymentModalOpen ? " chat-shell-payment-open" : ""}`}>
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
            <button
              type="button"
              className="chat-header-call-btn"
              onClick={() => startCall("voice")}
              disabled={activeCall || !!incomingCall}
              title="Appel vocal (entretien)"
              aria-label="Appel vocal"
            >
              <Phone size={18} />
            </button>
            <button
              type="button"
              className="chat-header-call-btn chat-header-call-btn-video"
              onClick={() => startCall("video")}
              disabled={activeCall || !!incomingCall}
              title="Appel vidéo (entretien)"
              aria-label="Appel vidéo"
            >
              <Video size={18} />
            </button>
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
              const canEdit = msg.from === role && !isTempId(msg.id) && msg.type !== "photo" && msg.type !== "file" && msg.type !== "voice" && isWithinEditWindow(msg.createdAt) && !isDeleted;
              const canDelete = msg.from === role && !isTempId(msg.id) && !isDeleted;
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
                  ) : editingMessageId === msg.id && msg.from === role && msg.type !== "photo" && msg.type !== "file" && msg.type !== "voice" ? (
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
                  ) : msg.type === "voice" ? (
                    <div className="chat-bubble-attachment chat-bubble-voice">
                      <audio
                        controls
                        src={msg.attachmentData ?? msg.attachment_data}
                        className="chat-voice-player"
                      >
                        Ton navigateur ne supporte pas l&apos;audio.
                      </audio>
                    </div>
                  ) : msg.type === "file" ? (
                    <div className="chat-bubble-attachment chat-bubble-file">
                      <FileText size={20} className="chat-file-icon" aria-hidden />
                      <span className="chat-file-name">{msg.attachmentName ?? msg.attachment_name ?? msg.text}</span>
                      {(msg.attachmentData ?? msg.attachment_data) && (
                        <a
                          href={msg.attachmentData ?? msg.attachment_data}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chat-file-download"
                        >
                          Télécharger
                        </a>
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
                      {canDelete && editingMessageId !== msg.id && (
                        <span className="chat-bubble-actions">
                          {msg.type !== "photo" && msg.type !== "file" && msg.type !== "voice" && canEdit && (
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
                            onClick={() => setMessageToDelete(msg)}
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
          {isRecording ? (
            <div className="chat-voice-bar">
              <button
                type="button"
                className="chat-voice-bar-cancel"
                onClick={cancelRecording}
                title="Supprimer l'enregistrement"
                aria-label="Annuler"
              >
                <Trash2 size={20} />
              </button>
              <span className="chat-voice-bar-duration">
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
              </span>
              <div className="chat-voice-bar-waveform">
                <canvas
                  ref={waveformCanvasRef}
                  width={200}
                  height={40}
                  className="chat-voice-waveform-canvas"
                  aria-hidden
                />
              </div>
              <button
                type="button"
                className="chat-send-btn"
                title="Envoyer le message vocal"
                onClick={toggleVoiceRecording}
                aria-label="Envoyer"
              >
                <Send size={22} aria-hidden />
              </button>
            </div>
          ) : (
            <>
              <div className="chat-emoji-picker-wrap" ref={emojiPickerWrapRef}>
                <button
                  type="button"
                  className="chat-icon-button"
                  title="Choisir un emoji"
                  onClick={() => setEmojiPickerOpen((v) => !v)}
                  aria-expanded={emojiPickerOpen}
                >
                  <Smile size={20} aria-hidden />
                </button>
                {emojiPickerOpen && (
                  <div className="chat-emoji-picker-popover">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        const el = inputRef.current;
                        const emoji = emojiData.emoji;
                        if (el) {
                          const start = el.selectionStart ?? input.length;
                          const end = el.selectionEnd ?? input.length;
                          const next = input.slice(0, start) + emoji + input.slice(end);
                          setInput(next);
                          setTimeout(() => {
                            const pos = start + emoji.length;
                            el.setSelectionRange(pos, pos);
                            el.focus();
                          }, 0);
                        } else {
                          setInput((v) => v + emoji);
                        }
                      }}
                      theme="dark"
                      width={320}
                      height={380}
                    />
                  </div>
                )}
              </div>
              <label className="chat-icon-button" title="Envoyer un fichier" style={{ cursor: "pointer" }}>
                <Paperclip size={20} aria-hidden />
                <input
                  type="file"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) sendAttachment(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <input
                ref={inputRef}
                className="chat-input"
                placeholder={
                  role === "recruiter"
                    ? "Écris un message au travailleur…"
                    : "Écris un message au recruteur…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              {input.trim() ? (
                <button
                  type="submit"
                  className="chat-send-btn"
                  title="Envoyer"
                  aria-label="Envoyer"
                >
                  <Send size={22} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="chat-send-btn chat-send-voice"
                  title="Message vocal (max 1 min)"
                  onClick={toggleVoiceRecording}
                  disabled={!applicationId}
                  aria-label="Message vocal"
                >
                  <Mic size={22} aria-hidden />
                </button>
              )}
            </>
          )}
        </form>
      </div>

      {/* Appel entrant */}
      {incomingCall && !activeCall && (
        <div className="chat-call-overlay" role="dialog" aria-modal="true">
          <div className="chat-call-incoming-box">
            <div className="chat-call-incoming-icon">
              {incomingCall.type === "video" ? <Video size={48} /> : <Phone size={48} />}
            </div>
            <p className="chat-call-incoming-title">
              {incomingCall.type === "video" ? "Appel vidéo" : "Appel vocal"}
            </p>
            <p className="chat-call-incoming-subtitle">{counterpartName} vous appelle</p>
            <div className="chat-call-incoming-actions">
              <button type="button" className="chat-call-btn chat-call-reject" onClick={rejectCall} aria-label="Refuser">
                <PhoneOff size={24} />
                <span>Refuser</span>
              </button>
              <button type="button" className="chat-call-btn chat-call-accept" onClick={acceptCall} aria-label="Accepter">
                <Phone size={24} />
                <span>Accepter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appel en cours */}
      {activeCall && (
        <div className="chat-call-overlay chat-call-active" role="dialog" aria-modal="true">
          <div className="chat-call-container">
            {callError && <p className="chat-call-error">{callError}</p>}
            <div className="chat-call-videos">
              {callType === "video" && (
                <div className="chat-call-local-video">
                  <video ref={localVideoRef} autoPlay muted playsInline />
                  <span className="chat-call-video-label">Toi</span>
                </div>
              )}
              <div className="chat-call-remote-video">
                <video ref={remoteVideoRef} autoPlay playsInline />
                <span className="chat-call-video-label">{counterpartName}</span>
              </div>
            </div>
            <div className="chat-call-controls">
              <button type="button" className="chat-call-control-btn" onClick={toggleMute} title={localMuted ? "Activer le micro" : "Couper le micro"}>
                <Mic size={22} style={{ opacity: localMuted ? 0.5 : 1 }} />
              </button>
              <button type="button" className="chat-call-control-btn chat-call-control-end" onClick={endCall} title="Raccrocher">
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

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

      {messageToDelete && (
        <>
          <div
            className="chat-delete-overlay"
            onClick={() => setMessageToDelete(null)}
            aria-hidden="true"
          />
          <div className="chat-delete-modal-box" role="dialog" aria-modal="true" aria-labelledby="delete-msg-modal-title">
            <h2 id="delete-msg-modal-title" className="chat-delete-modal-title">Êtes-vous sûr de vouloir supprimer ce message ?</h2>
            <p className="chat-delete-modal-desc">
              Ce message sera supprimé pour tout le monde.
            </p>
            <div className="chat-delete-modal-footer">
              <button
                type="button"
                className="chat-payment-modal-cancel"
                onClick={() => setMessageToDelete(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="chat-delete-modal-confirm"
                onClick={confirmDeleteMessage}
              >
                Supprimer
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
