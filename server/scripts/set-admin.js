/**
 * Passe le compte 0711118582 (id 1) en rôle admin.
 * Usage: node scripts/set-admin.js
 */
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("DATABASE_URL non défini.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    const result = await pool.query(
      `UPDATE users SET role = 'admin' WHERE id = 1 RETURNING id, phone, role, profile`
    );
    if (result.rowCount === 0) {
      console.log("Aucun utilisateur avec id 1.");
      return;
    }
    const row = result.rows[0];
    const profile = typeof row.profile === "object" ? row.profile : JSON.parse(row.profile || "{}");
    console.log("\nCompte mis à jour :");
    console.log("  ID        :", row.id);
    console.log("  Téléphone :", row.phone);
    console.log("  Rôle      :", row.role);
    console.log("  Nom       :", profile?.fullName ?? "(vide)");
    console.log("\nTu peux te connecter avec ce numéro et ton mot de passe ; l'onglet Admin apparaîtra.\n");
  } catch (err) {
    console.error("Erreur:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
