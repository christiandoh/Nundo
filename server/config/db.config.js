import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";

dotenv.config();

const { Pool } = pkg;

const INIT_ADMIN_PHONE = process.env.INIT_ADMIN_PHONE || "0711118582";
const INIT_ADMIN_NAME = process.env.INIT_ADMIN_NAME || "doh lah";
const INIT_ADMIN_PASSWORD = process.env.INIT_ADMIN_PASSWORD || "Hacker@117";

let pool = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(32) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'worker',
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  salary VARCHAR(64) NOT NULL,
  contract_type VARCHAR(64),
  description TEXT,
  recruiter_id INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id INT NOT NULL,
  message TEXT,
  worker_name VARCHAR(255),
  worker_main_skill VARCHAR(255),
  worker_avatar_url TEXT,
  status VARCHAR(32) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_role VARCHAR(32) NOT NULL,
  text TEXT NOT NULL,
  type VARCHAR(32) DEFAULT 'text',
  attachment_name VARCHAR(255),
  attachment_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function initSchema(p) {
  await p.query(SCHEMA);
  await p.query(`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_data TEXT;
  `).catch(() => {});
  await p.query(`
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS worker_avatar_url TEXT;
  `).catch(() => {});
  await p.query(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_id INT;
  `).catch(() => {});
  await p.query(`
    ALTER TABLE jobs ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'open';
  `).catch(() => {});
  await p.query(`
    UPDATE jobs SET recruiter_id = (SELECT id FROM users WHERE role = 'recruiter' ORDER BY id LIMIT 1)
    WHERE recruiter_id IS NULL
  `).catch(() => {});
  await p.query(`
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
  `).catch(() => {});
  await p.query(`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
  `).catch(() => {});
  await p.query(`
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  `).catch(() => {});

  await p.query(`
    CREATE TABLE IF NOT EXISTS escrow_payments (
      id SERIAL PRIMARY KEY,
      application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      recruiter_id INT NOT NULL,
      worker_id INT NOT NULL,
      amount_total INT NOT NULL,
      amount_worker INT NOT NULL,
      amount_commission INT NOT NULL,
      currency VARCHAR(8) DEFAULT 'XOF',
      status VARCHAR(32) DEFAULT 'pending_payment',
      aggregator VARCHAR(64) DEFAULT 'adullam',
      aggregator_ref VARCHAR(255),
      worker_phone VARCHAR(32),
      recruiter_phone VARCHAR(32),
      released_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch(() => {});

  const count = await p.query("SELECT COUNT(*) FROM jobs");
  if (Number(count.rows[0].count) === 0) {
    await p.query(
      `INSERT INTO jobs (title, location, salary, contract_type, description)
       VALUES ('Chauffeur privé', 'Abobo', '250000', 'CDI', 'Mission longue durée pour famille résidant à Abobo.')`
    );
  }

  await seedAdmin(p);
}

async function seedAdmin(p) {
  const existing = await p.query(
    "SELECT id, role FROM users WHERE phone = $1",
    [INIT_ADMIN_PHONE]
  );
  if (existing.rows.length > 0) {
    return;
  }
  const passwordHash = await bcrypt.hash(INIT_ADMIN_PASSWORD, 10);
  await p.query(
    `INSERT INTO users (phone, password_hash, role, profile)
     VALUES ($1, $2, 'admin', $3)`,
    [INIT_ADMIN_PHONE, passwordHash, JSON.stringify({ fullName: INIT_ADMIN_NAME })]
  );
  console.log("[NUNDO] Compte admin par défaut créé (téléphone:", INIT_ADMIN_PHONE + ").");
}

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  pool
    .query("SELECT 1")
    .then(() => {
      console.log("PostgreSQL connecté (health-check initial).");
      return initSchema(pool);
    })
    .then(() => {
      console.log("Schéma DB initialisé.");
    })
    .catch((err) => {
      console.error("Échec de connexion ou schéma PostgreSQL:", err.message);
    });
} else {
  console.warn(
    "[NUNDO] DATABASE_URL non défini. Le backend utilise les stores en mémoire."
  );
}

export { pool };
