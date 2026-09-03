import catalogRows from "./tray-catalog-index.json";

export type TrayKind = "tray" | "cover" | "angle" | "tee" | "cross" | "connector" | "bracket" | "unknown";
export type TrayDesign = "perforated" | "solid" | "wire" | "ladder" | null;
export type SourceRow = { position: string; name: string; article: string; quantity: number; unit: string };
export type ConvertedRow = SourceRow & { manufacturer: string; catalogName: string | null; series: string | null; kind: TrayKind; trayDesign: TrayDesign; coating: string | null; thickness: number | null; width: number | null; height: number | null; length: number | null; characteristics: string[]; missingCharacteristics: string[]; klmName: string; klmArticle: string; klmQuantity: number; confidence: number; status: "matched" | "review" };
type CatalogRow = { manufacturer: string; article: string; name: string; family: string };
const normalizeArticle = (value: string) => value.toLowerCase().replace(/[\s_]/g, "").replace(/,/g, ".");
const CATALOG_BY_ARTICLE = new Map((catalogRows as CatalogRow[]).map((row) => [normalizeArticle(row.article), row]));

// \b в JS считает словом только ASCII, поэтому границы вокруг кириллицы задаём
// юникодными lookaround-ами: иначе «ДКС», «ИЭК», «мм» и т. п. не совпадают.
export const MANUFACTURERS = [
  { name: "EAE", aliases: /(?<![\p{L}\d])(eae|еае|e-line|ukfg|uks|ukd|ctk|kca)(?![\p{L}\d])/iu, article: /^(30|31|32)\d{5}$/i },
  { name: "DKC", aliases: /(?<![\p{L}\d])(dkc|дкс|combitech|s5|l5|f5)(?![\p{L}\d])/iu, article: /^(35|36|37|38)\d{3}$/i },
  { name: "IEK", aliases: /(?<![\p{L}\d])(iek|иэк|esca)(?![\p{L}\d])/iu, article: /^(clp|cln|clw|cta|cpo|ct)/i },
  { name: "EKF", aliases: /(?<![\p{L}\d])(ekf|экф|t-line|f-line|l-line)(?![\p{L}\d])/iu, article: /^(l\d{4,}|tray-|tt-)/i },
  { name: "OSTEC", aliases: /(?<![\p{L}\d])(ostec|остек)(?![\p{L}\d])/iu, article: /^(лм|лп|лн|кн|пл)[-_\d]/i },
  { name: "Промрукав", aliases: /промрукав|promrukav|серия\s+профи/i, article: /^(pr|лм)[-_]?\d/i },
  { name: "КМ-профиль", aliases: /км[- ]?профиль|km[- ]?profil/i, article: /^(lp|ln|ll|kp)[-_]?\d/i },
  { name: "СЗПК", aliases: /(?<![\p{L}\d])(сзпк|szpk)(?![\p{L}\d])/iu, article: /^сзпк/i },
  { name: "OBO Bettermann", aliases: /(?<![\p{L}\d])(obo|bettermann|обо)(?![\p{L}\d])/iu, article: /^6\d{6}$/i },
  { name: "KOPOS", aliases: /(?<![\p{L}\d])(kopos|копос)(?![\p{L}\d])/iu, article: /^(mks|nks|jupiter)/i },
  { name: "Niedax", aliases: /(?<![\p{L}\d])(niedax|нидакс)(?![\p{L}\d])/iu, article: /^(rks|rkb|gus)/i },
  { name: "Vergokan", aliases: /(?<![\p{L}\d])(vergokan|вергокан)(?![\p{L}\d])/iu, article: /^(kbs|kl|bs)/i },
] as const;
export function detectManufacturer(name: string, article: string): string { return MANUFACTURERS.find((item) => item.aliases.test(name) || item.article.test(article.trim()))?.name ?? "Не определён"; }

const KIND: Array<{ kind: TrayKind; title: string; code: string; words: RegExp }> = [
  { kind: "cover", title: "Крышка лотка", code: "KLM-KR", words: /крыш|cover/i }, { kind: "tee", title: "Ответвитель Т-образный", code: "KLM-OT", words: /т[- ]?образ|тройник|tee/i },
  { kind: "cross", title: "Ответвитель крестообразный", code: "KLM-OK", words: /крест|cross/i }, { kind: "angle", title: "Угол для лотка", code: "KLM-UG", words: /угол|поворот|bend|angle/i },
  { kind: "connector", title: "Соединитель лотка", code: "KLM-SL", words: /соедин|стык|connector/i }, { kind: "bracket", title: "Кронштейн для лотка", code: "KLM-KN", words: /кроншт|подвес|консол|bracket/i },
  { kind: "tray", title: "Лоток кабельный", code: "KLM-L", words: /лоток|tray|лестнич|перфор|неперфор|проволоч/i },
];
const DESIGN = [
  { value: "solid" as const, label: "неперфорированный", code: "LN", words: /неперф|глухой|solid/i }, { value: "wire" as const, label: "проволочный", code: "LPV", words: /проволоч|wire/i },
  { value: "ladder" as const, label: "лестничный", code: "LL", words: /лестнич|ladder/i }, { value: "perforated" as const, label: "перфорированный", code: "LP", words: /перф|perforat/i },
];
const number = (value: unknown, fallback = 0) => { const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : fallback; };
export function rowsFromMatrix(matrix: unknown[][]): SourceRow[] {
  if (!matrix.length) return []; const labels = matrix[0].map((cell) => String(cell ?? "").toLowerCase().trim()); const hasHeader = labels.some((label) => /наимен|назван|описан|товар|артик|кол|qty|ед\.?/.test(label));
  const find = (re: RegExp, fallback: number) => { const index = labels.findIndex((label) => re.test(label)); return index >= 0 ? index : fallback; };
  const ni = find(/наимен|назван|описан|товар|name/, 1), ai = find(/артик|код|sku/, 2), qi = find(/кол|qty|quantity/, 3), ui = find(/ед\.?|unit/, 4), pi = find(/поз|№|номер|^n$/i, 0);
  return matrix.slice(hasHeader ? 1 : 0).map((row, index) => ({ position: String(row[pi] ?? index + 1).trim(), name: String(row[ni] ?? row[0] ?? "").trim(), article: String(row[ai] ?? "").trim(), quantity: Math.max(0, number(row[qi], 1)), unit: String(row[ui] ?? "шт").trim() || "шт" })).filter((row) => row.name.length > 1);
}
function dimensions(text: string, manufacturer: string) {
  const eae = text.match(/\b(\d{2,3})\s+(?:UKD|UKS|UKFG|UKF|CT|CTK|CTH|TLS|KM|KMH)\s+(\d{2,3})\b/i); if (eae) return { width: Number(eae[2]), height: Number(eae[1]), length: 3000 };
  const match = text.match(/(\d{2,4})\s*[xх×*]\s*(\d{2,4})(?:\s*[xх×*]\s*(\d{2,4}))?/i); if (!match) return { width: null, height: null, length: null };
  const first = Number(match[1]), second = Number(match[2]), third = match[3] ? Number(match[3]) : null; if (third !== null && first > 500 && third <= 600) return { width: second, height: third, length: first }; if (/^(EKF|IEK)$/.test(manufacturer)) return { width: second, height: first, length: third }; return { width: first, height: second, length: third };
}
function detectCoating(text: string) { if (/hdz|горяч\w*\s+цинк|горячего цинк|hot[- ]?dip/i.test(text)) return "горячее цинкование"; if (/inox|нержав|aisi\s*\d+/i.test(text)) return "нержавеющая сталь"; if (/ral\s*\d+|окраш|порошков/i.test(text)) return "порошковая окраска"; if (/сендзимир|sendzimir|предварительно оцинк|pre[- ]?galv|оцинкован/i.test(text)) return "сталь Сендзимир"; return null; }
function detectThickness(text: string) { const match = text.match(/(?:толщ(?:ина)?\s*[:=]?|(?<![\p{L}\d])[stт]\s*=|[-(]\s*)(\d(?:[.,]\d+)?)\s*мм(?![\p{L}\d])/iu); return match ? Number(match[1].replace(",", ".")) : null; }

export function convertRow(row: SourceRow): ConvertedRow {
  const catalogMatch = CATALOG_BY_ARTICLE.get(normalizeArticle(row.article)); const manufacturer = catalogMatch?.manufacturer ?? detectManufacturer(row.name, row.article); const text = `${row.name} ${catalogMatch?.name ?? ""} ${catalogMatch?.family ?? ""} ${row.article}`;
  const match = KIND.find((item) => item.words.test(text)), kind = match?.kind ?? "unknown", designMatch = kind === "tray" ? DESIGN.find((item) => item.words.test(text)) : undefined, trayDesign = designMatch?.value ?? null, coating = detectCoating(text), thickness = detectThickness(text);
  const { width, height, length } = dimensions(text, manufacturer), standardLength = kind === "tray" ? (length && length >= 1000 ? length : 3000) : length;
  const characteristics = [catalogMatch?.family ? `серия ${catalogMatch.family}` : null, designMatch?.label, width ? `ширина ${width} мм` : null, height ? `высота ${height} мм` : null, standardLength ? `длина ${standardLength} мм` : null, thickness ? `сталь ${thickness} мм` : null, coating].filter((item): item is string => Boolean(item));
  const missingCharacteristics = kind === "tray" ? [[trayDesign, "исполнение"], [width, "ширина"], [height, "высота"], [thickness, "толщина"], [coating, "покрытие"]].filter(([value]) => !value).map(([, label]) => String(label)) : [];
  const size = [width, height, standardLength].filter((value) => value !== null).join("x"), coatingCode = coating === "горячее цинкование" ? "HDZ" : coating === "нержавеющая сталь" ? "INOX" : coating === "порошковая окраска" ? "RAL" : coating ? "SZ" : null;
  const articleParts = [kind === "tray" && designMatch ? `KLM-${designMatch.code}` : match?.code, size || null, thickness ? `T${thickness}` : null, coatingCode].filter(Boolean), requiredKnown = kind !== "unknown" && (kind !== "tray" || (trayDesign && width && height)), complete = requiredKnown && (kind !== "tray" || (thickness && coating));
  const confidence = catalogMatch ? 99 : complete ? 94 : requiredKnown ? 78 : kind !== "unknown" ? 55 : 20, meters = /(^|\s)(м|м\.|метр)/i.test(row.unit), klmQuantity = kind === "tray" && meters ? Math.ceil((row.quantity * 1000) / (standardLength || 3000)) : row.quantity;
  return { ...row, manufacturer, catalogName: catalogMatch?.name ?? null, series: catalogMatch?.family || null, kind, trayDesign, coating, thickness, width, height, length: standardLength, characteristics, missingCharacteristics, klmName: match ? `${match.title}${designMatch ? ` ${designMatch.label}` : ""}${size ? ` ${size} мм` : ""}${thickness ? `, ${thickness} мм` : ""}${coating ? `, ${coating}` : ""}` : "Требуется ручной подбор", klmArticle: articleParts.join("-") || "—", klmQuantity, confidence, status: complete ? "matched" : "review" };
}
export const convertRows = (rows: SourceRow[]) => rows.map(convertRow);
