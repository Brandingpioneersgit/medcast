// Robust CSV parser used by the bulk-import preview.
// Handles quoted fields, embedded commas, doubled-quote escapes ("foo, ""bar""")
// and CRLF / LF line endings. Returns rows as objects keyed by header.

export type CsvRow = Record<string, string>;

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[]; raw: string[][] } {
  const cells = parseCsvCells(text);
  if (cells.length === 0) return { headers: [], rows: [], raw: [] };
  const [headerRow, ...dataRows] = cells;
  const headers = headerRow.map((h) => h.trim());
  const rows: CsvRow[] = dataRows.map((row) => {
    const obj: CsvRow = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
  return { headers, rows, raw: cells };
}

/** Tokenise a CSV string into rows × cells. */
function parseCsvCells(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (c === "\r") {
      // Skip; \n on next char handles row break
      i += 1;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      // Skip empty rows entirely (avoid trailing-newline phantom row)
      if (row.length > 1 || row[0]?.trim() !== "") {
        out.push(row);
      }
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += c;
    i += 1;
  }

  // Flush trailing cell + row
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0]?.trim() !== "") {
      out.push(row);
    }
  }

  return out;
}
