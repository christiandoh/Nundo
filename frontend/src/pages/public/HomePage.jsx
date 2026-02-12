import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import heroImage from "@/pages/assets/image.png";

export function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      <section
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
        gap: "3rem",
        alignItems: "center"
      }}
    >
      <div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.35rem 0.85rem",
            borderRadius: 999,
            background: "rgba(15,23,42,0.03)",
            border: "1px solid rgba(148,163,184,0.35)",
            fontSize: 11
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "999px",
              background: "radial-gradient(circle at 30% 20%, #22c55e, #009e60)"
            }}
          />
          Talents vérifiés, Mobile Money, 100% Côte d&apos;Ivoire
        </motion.div>

        <motion.h1
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.45 }}
          style={{
            marginTop: "1.4rem",
            fontSize: "clamp(2.2rem, 3.2vw, 3rem)",
            lineHeight: 1.08
          }}
        >
          Trouve le bon{" "}
          <span style={{ color: "#f77f00" }}>talent local</span>{" "}
          en quelques minutes.
        </motion.h1>

        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.45 }}
          style={{
            marginTop: "1rem",
            fontSize: 14,
            color: "#4b5563",
            maxWidth: 520
          }}
        >
          Servante, chauffeur, gérant de bar, vigile, secrétaire, commercial… NUNDO
          connecte recruteurs et travailleurs de confiance, avec badges de vérification
          et paiements sécurisés Mobile Money.
        </motion.p>

        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.24, duration: 0.45 }}
          style={{ marginTop: "1.7rem", display: "flex", gap: "0.9rem", flexWrap: "wrap" }}
        >
          <button className="btn-primary">Je cherche un travailleur</button>
          <button className="btn-ghost" onClick={() => navigate("/jobs")}>
            Je cherche une mission
          </button>
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.45 }}
          style={{
            marginTop: "1.7rem",
            display: "flex",
            alignItems: "center",
            gap: "1.2rem",
            fontSize: 11.5,
            color: "#6b7280"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "999px",
                background:
                  "linear-gradient(135deg, #009e60, #22c55e)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 13,
                fontWeight: 600
              }}
            >
              CI
            </span>
            <span>Profils vérifiés par téléphone</span>
          </div>
          <span>·</span>
          <span>Support WhatsApp 7j/7</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.18, duration: 0.5 }}
        className="card"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 26,
          padding: "1.6rem",
          minHeight: 260
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top left, rgba(247,127,0,0.2), transparent 60%), radial-gradient(circle at bottom right, rgba(0,158,96,0.2), transparent 60%)",
            pointerEvents: "none"
          }}
        />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Recruteur</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Mission de chauffeur privé</div>
            </div>
            <span
              style={{
                padding: "0.25rem 0.7rem",
                borderRadius: 999,
                fontSize: 11,
                background: "rgba(15,23,42,0.06)"
              }}
            >
              Abobo · 250 000 CFA / mois
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "0.85rem",
              fontSize: 11.5
            }}
          >
            <div
              style={{
                borderRadius: 18,
                padding: "0.9rem 1rem",
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(148,163,184,0.35)"
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Candidats suggérés</div>
              <ul style={{ paddingLeft: "1.1rem", margin: 0, color: "#4b5563" }}>
                <li>Seydou, 6 ans d&apos;expérience</li>
                <li>Fatim, bilingue FR/EN</li>
                <li>Kouadio, badge vérifié</li>
              </ul>
            </div>
            <div
              style={{
                borderRadius: 18,
                padding: "0.9rem 1rem",
                background: "rgba(15,23,42,0.96)",
                color: "white",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between"
              }}
            >
              <div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>Temps moyen de placement</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>24 h</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Paiement</div>
                <div style={{ fontSize: 11.5 }}>Orange Money · MTN · Wave</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        style={{ marginTop: "3rem" }}
      >
        <div
          style={{
            borderRadius: 28,
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(15,23,42,0.22)"
          }}
        >
          <img
            src={heroImage}
            alt="Travailleur satisfait grâce à NUNDO"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>

        <div
          style={{
            marginTop: "1.4rem",
            maxWidth: 700,
            fontSize: 14,
            color: "#4b5563"
          }}
        >
          NUNDO simplifie le recrutement de{" "}
          <span style={{ color: "#f77f00", fontWeight: 600 }}>talents locaux</span> en te
          présentant des{" "}
          <span style={{ color: "#f77f00", fontWeight: 600 }}>travailleurs de confiance</span>,
          vérifiés et prêts à commencer rapidement. Gagne du temps sur la sélection, sécurise tes{" "}
          <span style={{ color: "#f77f00", fontWeight: 600 }}>placements</span> et paie en toute
          sérénité via{" "}
          <span style={{ color: "#f77f00", fontWeight: 600 }}>Mobile Money</span>.
        </div>
      </motion.section>
    </>
  );
}

