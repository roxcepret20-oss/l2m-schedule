// Reads the Clan -> Distribute -> Tally list of the game (16:9 screenshots, e.g. 1440x810) entirely in the browser.
// Images are decoded into in-memory canvases only; nothing is uploaded or stored.
import { isSameText, mapPixels } from "@/lib/participantOcr";

// Column strips as fractions of the screenshot, so any 16:9 resolution works.
const Y0 = 0.245;
const Y1 = 0.866;
const ITEM_STRIP = { x0: 0.225, x1: 0.4, y0: Y0, y1: Y1, redText: true };
const PRICE_STRIP = { x0: 0.765, x1: 0.835, y0: Y0, y1: Y1 };
const STATUS_STRIP = { x0: 0.9, x1: 0.965, y0: Y0, y1: Y1 };
// Rows are ~0.11 of the image height apart; a line belongs to a row when its centre is this close.
const ROW_WINDOW = 0.045;
const UPSCALE = 3;
const ASPECT = 16 / 9;
const ASPECT_TOLERANCE = 0.04;

// Item names are small red text: luminance is too low, so use the brightest channel instead.
function mapRedText(rgba) {
  for (let i = 0; i < rgba.length; i += 4) {
    const bright = Math.max(rgba[i], rgba[i + 1], rgba[i + 2]);
    const ink = Math.min(1, Math.max(0, (bright - 40) / 110));
    const out = 255 - Math.round(ink * 255);
    rgba[i] = rgba[i + 1] = rgba[i + 2] = out;
    rgba[i + 3] = 255;
  }
  return rgba;
}

/* ───────────── text parsing ───────────── */

/** "® 1,184" -> 1184. Returns null when no sensible whole number ends the text. */
export function parsePrice(text) {
  const match = String(text ?? "").trim().match(/([0-9OoIl|][0-9OoIl|,.]*)$/);
  if (!match) return null;
  const digits = match[1].replace(/[,.]/g, "").replace(/[Oo]/g, "0").replace(/[Il|]/g, "1");
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return value > 0 && Number.isSafeInteger(value) ? value : null;
}

export const isSold = (text) => isSameText(text, "Sold");

/** Item names often get stray icon glyphs glued to the start/end by OCR. */
export function cleanName(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[^A-Za-z0-9(]+/, "")
    .replace(/[^A-Za-z0-9)]+$/, "")
    .trim();
}

/**
 * Builds the rows from OCR lines `{ text, y }` (y in image fractions).
 * A row is a price line that has a "Sold" status on the same line; its name is the closest item line.
 */
export function pairRows(itemLines, priceLines, statusLines) {
  const rows = [];
  for (const price of priceLines) {
    const amount = parsePrice(price.text);
    if (amount === null) continue;
    const near = (line) => Math.abs(line.y - price.y) <= ROW_WINDOW;
    if (!statusLines.some((s) => near(s) && isSold(s.text))) continue;
    const candidates = itemLines.filter(near).sort((a, b) => Math.abs(a.y - price.y) - Math.abs(b.y - price.y));
    const name = cleanName(candidates[0]?.text);
    if (name.length < 2) continue;
    rows.push({ name, amount, y: price.y });
  }
  return rows.sort((a, b) => a.y - b.y).map(({ name, amount }) => ({ name, amount }));
}

/* ───────────── browser OCR ───────────── */

const abortError = () => new DOMException("Cancelled", "AbortError");

async function readStrip(worker, bitmap, strip) {
  const sx = Math.round(bitmap.width * strip.x0);
  const sy = Math.round(bitmap.height * strip.y0);
  const sw = Math.round(bitmap.width * (strip.x1 - strip.x0));
  const sh = Math.round(bitmap.height * (strip.y1 - strip.y0));

  const canvas = document.createElement("canvas");
  canvas.width = sw * UPSCALE;
  canvas.height = sh * UPSCALE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  (strip.redText ? mapRedText : mapPixels)(pixels.data);
  ctx.putImageData(pixels, 0, 0);

  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const lines = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines));
  const result = lines
    .map((line) => ({
      text: line.text.trim(),
      y: (sy + (line.bbox.y0 + line.bbox.y1) / 2 / UPSCALE) / bitmap.height,
    }))
    .filter((line) => line.text);
  canvas.width = canvas.height = 0;
  return result;
}

/**
 * OCRs the screenshots one by one and resolves with `{ items: [{ name, amount }], skipped }`.
 * Only rows whose status is "Sold" are returned. onProgress({ fraction, label, imageIndex, imageStatus }) drives the UI.
 */
export async function readIncomeScreens({ files, onProgress, signal }) {
  const { createWorker, PSM } = await import("tesseract.js");
  const total = files.length;
  const LOAD_WEIGHT = 0.1;
  const stepWeight = (1 - LOAD_WEIGHT) / (total * 3);
  const report = (fraction, label, imageIndex = -1, imageStatus) =>
    onProgress?.({ fraction: Math.min(1, fraction), label, imageIndex, imageStatus });

  let worker = null;
  let stepFraction = null;
  const throwIfAborted = () => {
    if (signal?.aborted) throw abortError();
  };
  // terminate() leaves in-flight jobs pending, so race every await against the abort signal.
  const guard = (promise) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(abortError());
      const onAbort = () => reject(abortError());
      signal?.addEventListener("abort", onAbort, { once: true });
      promise.then(resolve, reject).finally(() => signal?.removeEventListener("abort", onAbort));
    });

  signal?.addEventListener("abort", () => worker?.terminate(), { once: true });

  try {
    report(0, "Loading text recognition engine (first run downloads ~5 MB)…");
    worker = await guard(
      createWorker("eng", 1, {
        logger: (m) => {
          if (stepFraction) stepFraction(m);
          else if (m.status) report(LOAD_WEIGHT * (m.progress ?? 0), `Loading text recognition engine… (${m.status})`);
        },
      })
    );
    await guard(worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT }));

    const items = [];
    const skipped = [];
    for (let i = 0; i < total; i++) {
      throwIfAborted();
      const file = files[i];
      const base = LOAD_WEIGHT + i * 3 * stepWeight;
      report(base, `Image ${i + 1} of ${total}: opening…`, i, "working");

      let bitmap;
      try {
        bitmap = await guard(createImageBitmap(file));
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        skipped.push({ index: i, reason: "Not a readable image." });
        report(base + 3 * stepWeight, `Image ${i + 1} of ${total}: skipped`, i, "skipped");
        continue;
      }

      if (Math.abs(bitmap.width / bitmap.height - ASPECT) > ASPECT * ASPECT_TOLERANCE) {
        const { width, height } = bitmap;
        bitmap.close();
        skipped.push({ index: i, reason: `Expected a 16:9 screenshot (e.g. 1440×810), got ${width}×${height}.` });
        report(base + 3 * stepWeight, `Image ${i + 1} of ${total}: skipped`, i, "skipped");
        continue;
      }

      const readOne = async (strip, step, label) => {
        const start = base + step * stepWeight;
        stepFraction = (m) => {
          if (m.status === "recognizing text") report(start + (m.progress ?? 0) * stepWeight, label, i, "working");
        };
        report(start, label, i, "working");
        try {
          return await guard(readStrip(worker, bitmap, strip));
        } finally {
          stepFraction = null;
        }
      };

      try {
        const itemLines = await readOne(ITEM_STRIP, 0, `Image ${i + 1} of ${total}: reading item names…`);
        const priceLines = await readOne(PRICE_STRIP, 1, `Image ${i + 1} of ${total}: reading prices…`);
        const statusLines = await readOne(STATUS_STRIP, 2, `Image ${i + 1} of ${total}: reading status…`);
        const rows = pairRows(itemLines, priceLines, statusLines);
        if (rows.length === 0) skipped.push({ index: i, reason: "No sold items found. Use the Clan → Distribute → Tally screen." });
        items.push(...rows);
      } finally {
        bitmap.close();
      }
      report(base + 3 * stepWeight, `Image ${i + 1} of ${total}: done`, i, "done");
    }

    report(1, "Finished.");
    return { items, skipped };
  } finally {
    worker?.terminate();
  }
}
