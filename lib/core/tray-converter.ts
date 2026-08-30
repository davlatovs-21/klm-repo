export type TrayKind = "tray" | "cover" | "angle" | "tee" | "cross" | "connector" | "bracket" | "unknown";

export type SourceRow = {
  position: string;
  name: string;
  article: string;
  quantity: number;
  unit: string;
};

export type ConvertedRow = SourceRow & {
  manufacturer: string;
  catalogName: string | null;
  kind: TrayKind;
  width: number | null;
  height: number | null;
  length: number | null;
  klmName: string;
  klmArticle: string;
  klmQuantity: number;
  confidence: number;
  status: "matched" | "review";
};

type CatalogRow = { manufacturer: string; article: string; name: string; family: string };
const normalizeArticle = (value: string) => value.toLowerCase().replace(/[\s_]/g, "").replace(/,/g, ".");
const CATALOG_BY_ARTICLE = new Map((catalogRows as CatalogRow[]).map((row) => [normalizeArticle(row.article), row]));

export const MANUFACTURERS = [
  { name: "DKC", aliases: /\b(dkc|дкс|combitech|s5|l5|f5)\b/i, article: /^(35|36|37|38)\d{3}$/i },
  { name: "IEK", aliases: /\b(iek|иэк|esca)\b/i, article: /^(clp|cln|clw|cta|cpo|cpo|ct)/i },
  { name: "EKF", aliases: /\b(ekf|экф|t-line|f-line|l-line)\b/i, article: /^(l\d{4,}|tray-|tt-)/i },
  { name: "OSTEC", aliases: /\b(ostec|остек)\b/i, article: /^(лм|лп|лн|кн|пл)[-_\d]/i },
  { name: "Промрукав", aliases: /промрукав|promrukav|серия\s+профи/i, article: /^(pr|лм)[-_]?\d/i },
  { name: "КМ-профиль", aliases: /км[- ]?профиль|km[- ]?profil/i, article: /^(lp|ln|ll|kp)[-_]?\d/i },
  { name: "СЗПК", aliases: /\b(сзпк|szpk)\b/i, article: /^сзпк/i },
  { name: "OBO Bettermann", aliases: /\b(obo|bettermann|обо)\b/i, article: /^6\d{6}$/i },
  { name: "KOPOS", aliases: /\b(kopos|копос)\b/i, article: /^(mks|nks|jupiter)/i },
  { name: "Niedax", aliases: /\b(niedax|нидакс)\b/i, article: /^(rks|rkb|gus)/i },
  { name: "Vergokan", aliases: /\b(vergokan|вергокан)\b/i, article: /^(kbs|kl|bs)/i },
] as const;

export function detectManufacturer(name: string, article: string): string {
  return MANUFACTURERS.find((item) => item.aliases.test(name) || item.article.test(article.trim()))?.name ?? "Не определён";
}

const KIND: Array<{ kind: TrayKind; title: string; code: string; words: RegExp }> = [
  { kind: "cover", title: "Крышка лотка", code: "KLM-KR", words: /крыш|cover/i },
  { kind: "tee", title: "Ответвитель Т-образный", code: "KLM-OT", words: /т[- ]?образ|тройник|tee/i },
  { kind: "cross", title: "Ответвитель крестообразный", code: "KLM-OK", words: /крест|cross/i },
  { kind: "angle", title: "Угол для лотка", code: "KLM-UG", words: /угол|поворот|bend|angle/i },
  { kind: "connector", title: "Соединитель лотка", code: "KLM-SL", words: /соедин|стык|connector/i },
  { kind: "bracket", title: "Кронштейн для лотка", code: "KLM-KN", words: /кроншт|подвес|консол|bracket/i },
  { kind: "tray", title: "Лоток кабельный", code: "KLM-L", words: /лоток|tray|лестнич|перфор|неперфор/i },
];

const number = (value: unknown, fallback = 0) => {
  const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function rowsFromMatrix(matrix: unknown[][]): SourceRow[] {
  if (!matrix.length) return [];
  const labels = matrix[0].map((cell) => String(cell ?? "").toLowerCase().trim());
  const hasHeader = labels.some((label) => /наимен|назван|описан|товар|артик|кол|qty|ед\.?/.test(label));
  const find = (re: RegExp, fallback: number) => {
    const index = labels.findIndex((label) => re.test(label));
    return index >= 0 ? index : fallback;
  };
  const nameIndex = find(/наимен|назван|описан|товар|name/, 1);
  const articleIndex = find(/артик|код|sku/, 2);
  const quantityIndex = find(/кол|qty|quantity/, 3);
  const unitIndex = find(/ед\.?|unit/, 4);
  const positionIndex = find(/поз|№|номер|^n$/i, 0);

  return matrix.slice(hasHeader ? 1 : 0).map((row, index) => ({
    position: String(row[positionIndex] ?? index + 1).trim(),
    name: String(row[nameIndex] ?? row[0] ?? "").trim(),
    article: String(row[articleIndex] ?? "").trim(),
    quantity: Math.max(0, number(row[quantityIndex], 1)),
    unit: String(row[unitIndex] ?? "шт").trim() || "шт",
  })).filter((row) => row.name.length > 1);
}

function dimensions(text: string) {
  const groups = [...text.matchAll(/(\d{2,4})\s*[xх×*]\s*(\d{2,4})(?:\s*[xх×*]\s*(\d{2,4}))?/gi)];
  if (!groups.length) return { width: null, height: null, length: null };
  const [, a, b, c] = groups[0];
  const first = Number(a);
  const second = Number(b);
  const third = c ? Number(c) : null;
  if (third !== null && first > 500 && third <= 600) return { width: second, height: third, length: first };
  return { width: first, height: second, length: third };
}

export function convertRow(row: SourceRow): ConvertedRow {
  const catalogMatch = CATALOG_BY_ARTICLE.get(normalizeArticle(row.article));
  const text = `${row.name} ${catalogMatch?.name ?? ""} ${row.article}`;
  const match = KIND.find((item) => item.words.test(text));
  const kind = match?.kind ?? "unknown";
  const { width, height, length } = dimensions(text);
  const size = [width, height, length].filter(Boolean).join("x");
  const enough = kind !== "unknown" && (kind === "connector" || kind === "bracket" || width !== null);
  const confidence = kind === "unknown" ? 20 : width && height ? 94 : width ? 78 : 55;
  const meters = /(^|\s)(м|м\.|метр)/i.test(row.unit);
  const standardLength = length && length >= 1000 ? length : 3000;
  const klmQuantity = kind === "tray" && meters ? Math.ceil((row.quantity * 1000) / standardLength) : row.quantity;

  return {
    ...row,
    manufacturer: catalogMatch?.manufacturer ?? detectManufacturer(row.name, row.article),
    catalogName: catalogMatch?.name ?? null,
    kind,
    width,
    height,
    length: kind === "tray" ? standardLength : length,
    klmName: match ? `${match.title}${size ? ` ${size} мм` : ""}` : "Требуется ручной подбор",
    klmArticle: match ? `${match.code}${size ? `-${size}` : ""}` : "—",
    klmQuantity,
    confidence: catalogMatch ? 99 : confidence,
    status: enough ? "matched" : "review",
  };
}

export const convertRows = (rows: SourceRow[]) => rows.map(convertRow);
import catalogRows from "./tray-catalog-index.json";
