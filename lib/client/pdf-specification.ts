type PositionedText = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfReadProgress = {
  stage: "extracting" | "ocr";
  page: number;
  totalPages: number;
  progress?: number;
};

function hasUsableText(matrix: unknown[][]): boolean {
  const text = matrix.flat().join(" ").trim();
  if (text.length < 20 || /\/Order\b/.test(text)) return false;

  const visible = [...text].filter((character) => !/\s/u.test(character));
  const suspicious = visible.filter((character) =>
    /[\u0000-\u001f\u007f-\u009f\u25a1\ufffd]/u.test(character)
    || !/[\p{Script=Cyrillic}\p{Script=Latin}\p{Number}.,:;()№%+\-–—/\\×*"'«»_\[\]©®]/u.test(character),
  );
  return visible.length > 0 && suspicious.length / visible.length < 0.03;
}

function ocrTextToMatrix(text: string): unknown[][] {
  return text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 1)
    .map((line) => line.split(/\t+|\s{2,}/u).map((cell) => cell.trim()).filter(Boolean));
}

function pageItemsToMatrix(items: PositionedText[]): unknown[][] {
  const lines: PositionedText[][] = [];

  for (const item of items.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((candidate) => Math.abs(candidate[0].y - item.y) <= Math.max(2, item.height * 0.35));
    if (line) line.push(item);
    else lines.push([item]);
  }

  return lines.map((line) => {
    const sorted = line.sort((a, b) => a.x - b.x);
    const cells: string[] = [];
    let current = "";
    let previousEnd = 0;

    for (const item of sorted) {
      const gap = item.x - previousEnd;
      const columnGap = Math.max(10, item.height * 1.4);
      if (current && gap > columnGap) {
        cells.push(current.trim());
        current = item.text;
      } else {
        const wordGap = current && gap > Math.max(1.5, item.height * 0.15) ? " " : "";
        current += `${wordGap}${item.text}`;
      }
      previousEnd = item.x + item.width;
    }

    if (current.trim()) cells.push(current.trim());
    return cells;
  }).filter((row) => row.some((cell) => cell.length > 0));
}

export async function matrixFromPdf(
  data: ArrayBuffer,
  onProgress?: (progress: PdfReadProgress) => void,
): Promise<unknown[][]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const matrix: unknown[][] = [];

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    onProgress?.({ stage: "extracting", page: pageNumber, totalPages: pdfDocument.numPages });
    const page = await pdfDocument.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.flatMap((item): PositionedText[] => {
      if (!("str" in item) || !item.str.trim()) return [];
      return [{
        text: item.str.trim(),
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width ?? 0,
        height: item.height || Math.abs(item.transform[3] ?? 10),
      }];
    });
    matrix.push(...pageItemsToMatrix(items));
  }

  if (hasUsableText(matrix)) return matrix;

  const { createWorker } = await import("tesseract.js");
  let currentPage = 1;
  const worker = await createWorker(["rus", "eng"], undefined, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress?.({ stage: "ocr", page: currentPage, totalPages: pdfDocument.numPages, progress: message.progress });
      }
    },
  });
  const ocrMatrix: unknown[][] = [];

  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    for (currentPage = 1; currentPage <= pdfDocument.numPages; currentPage += 1) {
      onProgress?.({ stage: "ocr", page: currentPage, totalPages: pdfDocument.numPages, progress: 0 });
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const result = await worker.recognize(canvas);
      ocrMatrix.push(...ocrTextToMatrix(result.data.text));
      canvas.width = 1;
      canvas.height = 1;
    }
  } finally {
    await worker.terminate();
  }

  if (!ocrMatrix.length) throw new Error("Не удалось распознать текст в PDF");
  return ocrMatrix;
}
