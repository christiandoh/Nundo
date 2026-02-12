/**
 * Liste les comptes utilisateurs dans la base de données (sans mot de passe).
 * Usage: node scripts/list-users.js
 */
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("DATABASE_URL non défini. La base n'est pas utilisée (mode mémoire).");
  process.exit(0);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  try {
    const result = await pool.query(
      `SELECT id, phone, role, profile, created_at
       FROM users
       ORDER BY id ASC`
    );
    const rows = result.rows;
    console.log("\n--- Comptes dans la base de données (table users) ---\n");
    if (rows.length === 0) {
      console.log("Aucun utilisateur.");
      return;
    }
    for (const row of rows) {
      const profile = typeof row.profile === "object" ? row.profile : JSON.parse(row.profile || "{}");
      const name = profile?.fullName ?? "(vide)";
      const created = row.created_at
        ? new Date(row.created_at).toLocaleString("fr-FR")
        : "—";
      console.log(`ID: ${row.id}`);
      console.log(`  Téléphone : ${row.phone}`);
      console.log(`  Rôle      : ${row.role}`);
      console.log(`  Nom       : ${name}`);
      console.log(`  Créé le   : ${created}`);
      console.log("");
    }
    console.log(`Total : ${rows.length} compte(s).\n`);
  } catch (err) {
    console.error("Erreur:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
