import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  const tables = [
    "countries", "cities", "hospitals", "doctors",
    "specialties", "treatments", "hospital_treatments",
    "contact_inquiries", "testimonials",
  ];
  for (const t of tables) {
    const [r] = await sql.unsafe(`SELECT COUNT(*)::int AS n FROM "${t}"`);
    console.log(`${t}: ${r.n}`);
  }
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
