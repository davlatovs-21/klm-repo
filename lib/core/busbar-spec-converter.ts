export type SourceRow = { position: string; name: string; article: string; quantity: number; unit: string };
export type ConvertedRow = SourceRow & { manufacturer: string; catalogName: string | null; series: string | null; characteristics: string[]; missingCharacteristics: string[]; klmName: string; klmArticle: string; klmQuantity: number; confidence: number; status: "matched" | "review" };

const BRANDS = [
  { name: "PitON Electric", re: /piton|питон|\b(?:e3|cr1|crm|a5|l1|et|d4)[-_ ]/i, series: /\b(e3|cr1|crm|a5|l1|et|d4)\b/i },
  { name: "Schneider Electric", re: /schneider|canalis|\b(kta|ktc|ks|kn|kba|kbb)\b/i, series: /\b(canalis\s*)?(kta|ktc|ks|kn|kba|kbb)\b/i },
  { name: "Siemens", re: /siemens|sivacon|8ps|\b(bd01|bd2|ld|li)\b/i, series: /\b(sivacon\s*8ps|bd01|bd2|ld|li)\b/i },
  { name: "Legrand", re: /legrand|zucchini|\b(lbplus|mr|ms|hr|scp)\b/i, series: /\b(zucchini|lbplus|mr|ms|hr|scp)\b/i },
  { name: "EAE", re: /\beae\b|e[- ]?line|\b(kx|ko-ii|kd|mk|kl|cr|ccr)\b/i, series: /\b(e[- ]?line\s*)?(kx(?:-ii|-iii)?|ko-ii|kd|mk|kl|cr|ccr)\b/i },
  { name: "ДКС", re: /\b(dkc|дкс)\b|hercules|powertech|distritech|vibitech|lightech/i, series: /\b(hercules|powertech|distritech|vibitech|lightech)\b/i },
] as const;
const KINDS = [
  { label: "Коробка отбора мощности", code: "PB", re: /коробк.*отбор|tap[- ]?off|plug[- ]?in box/i },
  { label: "Противопожарная проходка", code: "FB", re: /огнестой|противопожар|fire barrier/i },
  { label: "Секция угловая горизонтальная", code: "CD", re: /горизонт.*уг|уг.*горизонт|horizontal elbow/i },
  { label: "Секция угловая вертикальная", code: "CP", re: /вертикал.*уг|уг.*вертикал|vertical elbow/i },
  { label: "Секция тройниковая", code: "T", re: /тройник|т[- ]?образ|tee unit/i },
  { label: "Секция присоединительная", code: "AT", re: /присоедин|вводн|feeder|transformer connection/i },
  { label: "Концевая заглушка", code: "EC", re: /заглуш|end (?:cap|cover)/i },
  { label: "Стыковочный элемент", code: "G", re: /стыков|соединит|joint/i },
  { label: "Крепление шинопровода", code: "SUP", re: /креплен|подвес|кронштейн|hanger|support/i },
  { label: "Секция прямая", code: "S", re: /прям.*секц|секц.*прям|шинопровод|busbar|busway|straight length/i },
] as const;
const number = (value: unknown, fallback = 0) => { const parsed = Number(String(value ?? "").replace(/\s/g, "").replace(",", ".")); return Number.isFinite(parsed) ? parsed : fallback; };

export function rowsFromMatrix(matrix: unknown[][]): SourceRow[] {
  if (!matrix.length) return [];
  const labels = matrix[0].map((cell) => String(cell ?? "").toLowerCase().trim());
  const hasHeader = labels.some((label) => /наимен|назван|описан|товар|артик|кол|qty|ед\.?/.test(label));
  const find = (re: RegExp, fallback: number) => { const index = labels.findIndex((label) => re.test(label)); return index >= 0 ? index : fallback; };
  const ni = find(/наимен|назван|описан|товар|name/, 1), ai = find(/артик|код|sku/, 2), qi = find(/кол|qty|quantity/, 3), ui = find(/ед\.?|unit/, 4), pi = find(/поз|№|номер|^n$/i, 0);
  return matrix.slice(hasHeader ? 1 : 0).map((row, index) => ({ position: String(row[pi] ?? index + 1).trim(), name: String(row[ni] ?? row[0] ?? "").trim(), article: String(row[ai] ?? "").trim(), quantity: Math.max(0, number(row[qi], 1)), unit: String(row[ui] ?? "шт").trim() || "шт" })).filter((row) => row.name.length > 1);
}

function convertRow(row: SourceRow): ConvertedRow {
  const text = `${row.name} ${row.article}`;
  const brand = BRANDS.find((item) => item.re.test(text)), series = brand?.series.exec(text)?.[0] ?? null, kind = KINDS.find((item) => item.re.test(text));
  const pitonArticle = text.match(/\b(?:e3|cr1|crm|a5|l1|et|d4)-(\d{2})-(al|cu)-([345])-(\d{2,4})\b/i);
  const currentMatch = text.match(/\b(25|40|63|100|125|140|160|200|225|250|315|400|500|600|630|800|1000|1250|1600|2000|2500|3200|4000|5000|6300|6400|7500)\s*(?:а|a|amp)\b/i);
  const current = currentMatch ? Number(currentMatch[1]) : pitonArticle ? Number(pitonArticle[4]) : null;
  const material = /\b(cu|медн|медь)\b/i.test(text) ? "Cu" : /\b(al|алюм)\b/i.test(text) ? "Al" : null;
  const ip = Number(text.match(/\bip\s*(\d{2})\b/i)?.[1] ?? pitonArticle?.[1]) || null, poles = Number(text.match(/\b([345])\s*(?:p|полюс|проводник)/i)?.[1] ?? pitonArticle?.[3]) || null;
  const missing = [!kind && "тип элемента", !current && "номинальный ток", !material && "материал шин", !ip && "IP", !poles && "число проводников"].filter(Boolean) as string[];
  const characteristics = [current && `${current} А`, material, ip && `IP${ip}`, poles && `${poles}P`].filter(Boolean).map(String);
  const klmSeries = current != null && current <= 800 ? "KLM-R" : "KLM-S", label = kind?.label ?? "Элемент шинопровода";
  return { ...row, manufacturer: brand?.name ?? "Не определён", catalogName: brand ? `${brand.name}${series ? ` · ${series}` : ""}` : null, series, characteristics, missingCharacteristics: missing, klmName: `${label}${current ? ` ${current} А` : ""}${material ? ` ${material}` : ""}${ip ? ` IP${ip}` : ""}${poles ? ` ${poles}P` : ""}`, klmArticle: [klmSeries, kind?.code ?? "CHECK", current, material, ip && `IP${ip}`, poles && `${poles}P`].filter(Boolean).join("-"), klmQuantity: row.quantity, confidence: Math.max(20, 100 - missing.length * 16 - (!brand ? 8 : 0)), status: missing.length <= 1 ? "matched" : "review" };
}
export const convertRows = (rows: SourceRow[]) => rows.map(convertRow);
