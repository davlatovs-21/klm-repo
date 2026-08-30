"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { convertRows, rowsFromMatrix, type ConvertedRow } from "@/lib/core/tray-converter";

const SAMPLE = [
  ["Поз.", "Наименование", "Артикул", "Кол-во", "Ед."],
  [1, "Лоток перфорированный 200x80x3000", "CON-200-80", 24, "шт"],
  [2, "Крышка лотка 200x3000", "CON-C-200", 72, "м"],
  [3, "Угол горизонтальный 200x80", "CON-A90", 6, "шт"],
  [4, "Соединитель лотка 80", "CON-J", 30, "шт"],
];

function escapeCsv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function TraySpecificationConverter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ConvertedRow[]>([]);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const matched = useMemo(() => rows.filter((row) => row.status === "matched").length, [rows]);

  async function load(file: File) {
    setError("");
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
      const source = rowsFromMatrix(matrix);
      if (!source.length) throw new Error("Не удалось найти строки с наименованиями");
      setRows(convertRows(source));
      setFileName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось прочитать файл");
      setRows([]);
    }
  }

  function loadSample() {
    setRows(convertRows(rowsFromMatrix(SAMPLE)));
    setFileName("Пример спецификации.xlsx");
    setError("");
  }

  function update(index: number, patch: Partial<ConvertedRow>) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  }

  function download() {
    const header = ["Поз.", "Исходное наименование", "Исходный артикул", "Наименование KLM", "Артикул KLM", "Кол-во", "Ед.", "Уверенность"];
    const body = rows.map((row) => [row.position, row.name, row.article, row.klmName, row.klmArticle, row.klmQuantity, "шт", `${row.confidence}%`]);
    const csv = "\uFEFF" + [header, ...body].map((line) => line.map(escapeCsv).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `KLM-${fileName.replace(/\.[^.]+$/, "") || "specification"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void load(file); }}
          className={`rounded-xl2 border-2 border-dashed p-7 text-center transition-colors ${dragging ? "border-cur bg-cur-soft" : "border-line-2 bg-surface"}`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv,.tsv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void load(file); }} />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cur-soft text-2xl text-cur-d">↑</div>
          <h2 className="display mt-4 text-[18px]">Загрузите спецификацию конкурента</h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-mute">Excel или CSV. Желательные столбцы: позиция, наименование, артикул, количество и единица измерения.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button onClick={() => inputRef.current?.click()} className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white hover:bg-ink-2">Выбрать файл</button>
            <button onClick={loadSample} className="rounded-full border border-line-2 px-5 py-2.5 text-[13px] font-bold hover:border-cur">Посмотреть пример</button>
          </div>
          {error && <p className="mt-4 text-[13px] font-semibold text-fault">{error}</p>}
        </div>

        <div className="rounded-xl2 bg-ink p-6 text-white">
          <p className="eyebrow text-cur">Как работает подбор</p>
          <ol className="mt-5 space-y-4 text-[13px]">
            {["Читаем строки и определяем тип изделия", "Извлекаем ширину, высоту и длину", "Формируем аналог и артикул KLM", "Помечаем неоднозначные позиции для проверки"].map((text, index) => (
              <li key={text} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cur text-[11px] font-bold">{index + 1}</span><span className="pt-0.5 text-[#c2d5dc]">{text}</span></li>
            ))}
          </ol>
          <p className="mt-6 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-[#8fb4c0]">Автоподбор предварительный. Перед заказом инженер должен сверить исполнение, толщину металла, покрытие и нагрузку.</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl2 border border-line bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
            <div><p className="eyebrow text-cur-d">Результат перебивки</p><h2 className="mt-1 font-bold">{fileName} · {rows.length} позиций</h2><p className="text-[12px] text-mute">Подобрано автоматически: {matched} · проверить: {rows.length - matched}</p></div>
            <button onClick={download} className="rounded-full bg-cur px-5 py-2.5 text-[13px] font-bold text-white hover:bg-cur-d">Скачать CSV для Excel</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[12px]">
              <thead className="bg-bg text-mute"><tr>{["Поз.", "Конкурент", "Аналог KLM", "Артикул KLM", "Кол-во", "Статус"].map((head) => <th key={head} className="px-4 py-3 font-bold">{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((row, index) => (
                  <tr key={`${row.position}-${index}`} className="align-top hover:bg-[#f8fbfc]">
                    <td className="px-4 py-4 font-mono">{row.position}</td>
                    <td className="max-w-[270px] px-4 py-4"><p className="font-semibold">{row.name}</p><p className="mt-1 text-mute">{row.article || "Без артикула"}</p></td>
                    <td className="px-4 py-3"><input aria-label={`Наименование KLM для позиции ${row.position}`} value={row.klmName} onChange={(event) => update(index, { klmName: event.target.value })} className="w-full min-w-[240px] rounded-lg border border-line px-3 py-2 focus:border-cur" /></td>
                    <td className="px-4 py-3"><input aria-label={`Артикул KLM для позиции ${row.position}`} value={row.klmArticle} onChange={(event) => update(index, { klmArticle: event.target.value })} className="w-44 rounded-lg border border-line px-3 py-2 font-mono focus:border-cur" /></td>
                    <td className="px-4 py-3"><input aria-label={`Количество для позиции ${row.position}`} type="number" min="0" value={row.klmQuantity} onChange={(event) => update(index, { klmQuantity: Number(event.target.value) })} className="w-20 rounded-lg border border-line px-3 py-2 font-mono focus:border-cur" /><span className="ml-2 text-mute">шт</span></td>
                    <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 font-bold ${row.status === "matched" ? "bg-cur-soft text-cur-d" : "bg-[#fff4dc] text-[#996600]"}`}>{row.status === "matched" ? `${row.confidence}% совпадение` : "Проверить"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

