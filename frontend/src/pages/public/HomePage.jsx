import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import heroImage from "@/pages/assets/image.png";
import logoOrange from "@/pages/assets/orange.png";
import logoMtn from "@/pages/assets/mtn.png";
import logoWave from "@/pages/assets/wave.jpg";
import logoMoov from "@/pages/assets/moov.png";
import africaImage from "@/pages/assets/africa.jpg";
import FlagForCoteDivoireIcon from "@/components/icons/FlagForCoteDivoireIcon.jsx";

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
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Recruteur</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Mission de chauffeur privé</div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1.25rem"
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.45rem 1rem",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                background: "linear-gradient(135deg, rgba(247,127,0,0.12), rgba(0,158,96,0.08))",
                border: "1px solid rgba(148,163,184,0.25)",
                color: "#0f172a",
                letterSpacing: "0.02em"
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
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>Paiement</div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap"
                  }}
                >
                  <img src={logoOrange} alt="Orange Money" style={{ height: 22, width: "auto", objectFit: "contain" }} />
                  <img src={logoMtn} alt="MTN" style={{ height: 22, width: "auto", objectFit: "contain" }} />
                  <img src={logoWave} alt="Wave" style={{ height: 22, width: "auto", objectFit: "contain" }} />
                  <img src={logoMoov} alt="Moov" style={{ height: 22, width: "auto", objectFit: "contain" }} />
                </div>
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

      {/* Présence en Afrique de l'Ouest */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          marginTop: "4rem",
          padding: "2.5rem 1.5rem",
          borderRadius: 24,
          background: "linear-gradient(160deg, rgba(247,127,0,0.06) 0%, rgba(0,158,96,0.06) 100%)",
          border: "1px solid rgba(148,163,184,0.2)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "clamp(1.35rem, 2vw, 1.6rem)",
              fontWeight: 700,
              color: "#0f172a",
              margin: 0
            }}
          >
            Notre présence en Afrique de l&apos;Ouest
          </h2>
          <p style={{ marginTop: "0.5rem", fontSize: 14, color: "#64748b" }}>
            Merci de nous faire confiance. Nous déployons notre activité pays par pays.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1.25rem",
            alignItems: "stretch"
          }}
        >
          {/* Côte d'Ivoire - active */}
          <div
            style={{
              flex: "1 1 200px",
              maxWidth: 280,
              padding: "1.25rem 1.5rem",
              borderRadius: 20,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(148,163,184,0.3)",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem"
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(15,23,42,0.15)"
              }}
            >
              <FlagForCoteDivoireIcon size={56} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>Côte d&apos;Ivoire</div>
            <div style={{ fontSize: 12, color: "#009e60", fontWeight: 600 }}>Actif</div>
          </div>

          {/* Africa · Thank you */}
          <div
            style={{
              flex: "1 1 200px",
              maxWidth: 280,
              padding: "1.25rem 1.5rem",
              borderRadius: 20,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(148,163,184,0.3)",
              boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem"
            }}
          >
            <img
              src={africaImage}
              alt="Afrique"
              style={{
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: 16
              }}
            />
            <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>Afrique</div>
            <div style={{ fontSize: 14, color: "#009e60", fontWeight: 600 }}>Merci</div>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "1.75rem", fontSize: 13, color: "#64748b" }}>
          Merci de nous faire confiance. NUNDO connecte recruteurs et travailleurs en Côte d&apos;Ivoire, avec d&apos;autres pays à venir.
        </p>
      </motion.section>
    </>
  );
}

