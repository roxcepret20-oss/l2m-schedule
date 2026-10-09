// Reads the "Participant" dialog of the game (16:9 screenshots, e.g. 1440x810) entirely in the browser.
// Images are decoded into in-memory canvases only; nothing is uploaded or stored.

// Column strips as fractions of the screenshot, so any 16:9 resolution works.
const NAME_STRIP = { x0: 0.185, x1: 0.34, y0: 0.268, y1: 0.866 };
const CLAN_STRIP = { x0: 0.462, x1: 0.625, y0: 0.268, y1: 0.866 };
// A name belongs to a clan line whose vertical centre is this close (fraction of image height).
const ROW_WINDOW = 0.05;
const UPSCALE = 3;
const ASPECT = 16 / 9;
const ASPECT_TOLERANCE = 0.04;

const BLACK_POINT = 30;
const WHITE_POINT = 110;

/** Light text on a dark background -> dark text on white, keeping anti-aliasing (better than a hard threshold). */
export function mapPixels(rgba) {
  const range = WHITE_POINT - BLACK_POINT;
  for (let i = 0; i < rgba.length; i += 4) {
    const lum = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    const ink = Math.min(1, Math.max(0, (lum - BLACK_POINT) / range));
    const out = 255 - Math.round(ink * 255);
    rgba[i] = rgba[i + 1] = rgba[i + 2] = out;
    rgba[i + 3] = 255;
  }
  return rgba;
}

/* ───────────── text matching ───────────── */

// OCR confuses look-alike glyphs (I / l / 1 / |, O / 0), so compare on a folded key.
export function foldKey(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[il1|!]/g, "l")
    .replace(/[o0]/g, "o")
    .replace(/[^a-z0-9]/g, "");
}

export function editDistance(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

const allowedErrors = (length) => (length <= 3 ? 0 : Math.max(1, Math.floor(length / 4)));

export function isSameText(a, b) {
  const ka = foldKey(a);
  const kb = foldKey(b);
  if (!ka || !kb) return false;
  return editDistance(ka, kb) <= allowedErrors(Math.max(ka.length, kb.length));
}

/** Best member for an OCR'd name, or null when nothing is close enough or two members tie. */
export function matchMember(name, members) {
  const key = foldKey(name);
  if (!key) return null;
  let best = null;
  let bestDistance = Infinity;
  let tied = false;
  for (const member of members) {
    const memberKey = foldKey(member.ign);
    if (!memberKey) continue;
    const distance = editDistance(key, memberKey);
    if (distance > allowedErrors(Math.max(key.length, memberKey.length))) continue;
    if (distance < bestDistance) {
      best = member;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  }
  return tied ? null : best;
}

/** Keeps the names whose row carries the wanted clan. Lines are `{ text, y }` with y in image fractions. */
export function pairRows(nameLines, clanLines, clanName) {
  return nameLines
    .filter((line) => foldKey(line.text).length >= 2)
    .filter((line) => clanLines.some((c) => Math.abs(c.y - line.y) <= ROW_WINDOW && isSameText(c.text, clanName)))
    .map((line) => line.text.trim());
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
  mapPixels(pixels.data);
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
 * OCRs the screenshots one by one and resolves with the unique names of `clanName` participants.
 * onProgress({ fraction, label, imageIndex, imageStatus }) drives the UI; `signal` cancels the run.
 */
export async function readParticipantScreens({ files, clanName, onProgress, signal }) {
  const { createWorker, PSM } = await import("tesseract.js");
  const total = files.length;
  const LOAD_WEIGHT = 0.1;
  const stepWeight = (1 - LOAD_WEIGHT) / (total * 2);
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

    const names = new Map();
    const skipped = [];
    for (let i = 0; i < total; i++) {
      throwIfAborted();
      const file = files[i];
      const base = LOAD_WEIGHT + i * 2 * stepWeight;
      report(base, `Image ${i + 1} of ${total}: opening…`, i, "working");

      let bitmap;
      try {
        bitmap = await guard(createImageBitmap(file));
      } catch (err) {
        if (err?.name === "AbortError") throw err;
        skipped.push({ index: i, reason: "Not a readable image." });
        report(base + 2 * stepWeight, `Image ${i + 1} of ${total}: skipped`, i, "skipped");
        continue;
      }

      if (Math.abs(bitmap.width / bitmap.height - ASPECT) > ASPECT * ASPECT_TOLERANCE) {
        const { width, height } = bitmap;
        bitmap.close();
        skipped.push({ index: i, reason: `Expected a 16:9 screenshot (e.g. 1440×810), got ${width}×${height}.` });
        report(base + 2 * stepWeight, `Image ${i + 1} of ${total}: skipped`, i, "skipped");
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
        const nameLines = await readOne(NAME_STRIP, 0, `Image ${i + 1} of ${total}: reading names…`);
        const clanLines = await readOne(CLAN_STRIP, 1, `Image ${i + 1} of ${total}: reading clans…`);
        for (const name of pairRows(nameLines, clanLines, clanName)) {
          const key = foldKey(name);
          if (!names.has(key)) names.set(key, name);
        }
      } finally {
        bitmap.close();
      }
      report(base + 2 * stepWeight, `Image ${i + 1} of ${total}: done`, i, "done");
    }

    report(1, "Finished.");
    return { names: [...names.values()], skipped };
  } finally {
    worker?.terminate();
  }
}
