import { decodeInput } from "@/lib/core/calc-url";
import type { Input } from "@/lib/core/select-busbar";

/**
 * Разбор строки запроса для страниц калькулятора. Живёт вне ядра: работает
 * с типом Next.js для searchParams, а ядро о фреймворке не знает (ТЗ 19.2).
 */
export type RawParams = Record<string, string | string[] | undefined>;

export type CalcParams = {
  initial: Input;
  /** Пришли по ссылке с параметрами расчёта — открываем сразу результат */
  initialStep: number;
  utm: Record<string, string>;
  dealer?: string;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function readCalcParams(raw: RawParams): CalcParams {
  const query = new URLSearchParams();
  const utm: Record<string, string> = {};
  let dealer: string | undefined;
  let hasCalcParams = false;

  for (const [k, value] of Object.entries(raw)) {
    const v = first(value);
    if (!v) continue;
    if (k.startsWith("utm_")) {
      utm[k] = v.slice(0, 200);
    } else if (k === "dealer") {
      // идентификатор дилера подставляется в разметку и в заявку — оставляем безопасный набор
      dealer = v.replace(/[^\w-]/g, "").slice(0, 64) || undefined;
    } else {
      query.set(k, v);
      hasCalcParams = true;
    }
  }

  return { initial: decodeInput(query.toString()), initialStep: hasCalcParams ? 3 : 0, utm, dealer };
}
