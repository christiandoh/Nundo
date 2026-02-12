/**
 * Remet toutes les candidatures "acceptées" en "en attente", rouvre les offres
 * et supprime les escrows associés pour que le flux acceptation + paiement s'applique à nouveau.
 * Usage: node scripts/reset-accepted.js
 */
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("DATABASE_URL non défini. Ce script ne fonctionne qu'avec PostgreSQL.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    const client = await pool.connect();

    const accepted = await client.query(
      "SELECT id, job_id FROM applications WHERE status = $1",
      ["accepted"]
    );
    const rows = accepted.rows;
    if (rows.length === 0) {
      console.log("\nAucune candidature acceptée à réinitialiser.\n");
      client.release();
      await pool.end();
      return;
    }

    const appIds = rows.map((r) => r.id);
    const jobIds = [...new Set(rows.map((r) => r.job_id))];

    await client.query("DELETE FROM escrow_payments WHERE application_id = ANY($1)", [appIds]);
    await client.query(
      "UPDATE applications SET status = $1, accepted_at = NULL WHERE id = ANY($2)",
      ["pending", appIds]
    );
    await client.query("UPDATE jobs SET status = $1 WHERE id = ANY($2)", ["open", jobIds]);

    client.release();
    await pool.end();

    console.log("\n--- Réinitialisation effectuée ---");
    console.log("Candidatures repassées en « en attente » :", appIds.length);
    console.log("Offres rouvertes :", jobIds.length);
    console.log("Escrows supprimés pour ces candidatures.");
    console.log("\nTu peux à nouveau accepter un candidat ; le flux paiement s’affichera.\n");
  } catch (err) {
    console.error("Erreur:", err.message);
    process.exit(1);
  }
}

main();
