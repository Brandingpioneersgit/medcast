import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);

  await sql`
    CREATE TABLE IF NOT EXISTS redirects (
      id SERIAL PRIMARY KEY,
      from_path VARCHAR(500) NOT NULL UNIQUE,
      to_path VARCHAR(500) NOT NULL,
      status_code INTEGER NOT NULL DEFAULT 301,
      note VARCHAR(255),
      hit_count INTEGER NOT NULL DEFAULT 0,
      last_hit_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_redirects_from_path ON redirects (from_path)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_redirects_created_at ON redirects (created_at DESC)`;

  console.log("redirects table ready");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
