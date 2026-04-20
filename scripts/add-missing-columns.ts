import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

const stmts: string[] = [
  // doctors — license + cal fields
  `ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_verified boolean DEFAULT false`,
  `ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_verified_at timestamp`,
  `ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_number varchar(100)`,
  `ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_country varchar(10)`,
  `ALTER TABLE doctors ADD COLUMN IF NOT EXISTS license_registrar varchar(200)`,
  `ALTER TABLE doctors ADD COLUMN IF NOT EXISTS cal_url varchar(500)`,
  // hospitals — verification + commission
  `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false`,
  `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS featured_until timestamp`,
  `ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS commission_percent decimal(5,2)`,
];

(async () => {
  for (const s of stmts) {
    try {
      await sql.unsafe(s);
      const col = s.match(/IF NOT EXISTS (\w+)/)?.[1] ?? "ok";
      console.log(`✓ ${s.split(" ADD ")[0].replace("ALTER TABLE ", "")} · ${col}`);
    } catch (e) {
      console.error(`✗ ${s}`, (e as Error).message);
    }
  }
  await sql.end();
})();
