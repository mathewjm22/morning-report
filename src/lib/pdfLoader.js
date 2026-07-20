
// Wraps pdf.js: loading a PDF, rendering pages to canvas, detecting
// image/table bounding boxes for interactive zones.

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Load a PDF from an ArrayBuffer or URL, return the pdfjs document
export async function loadPdf(source) {
  const task = source instanceof ArrayBuffer
    ? pdfjsLib.getDocument({ data: source })
    : pdfjsLib.getDocument(source);
  return await task.promise;
}

// Add this to pdfLoader.js
export async function getPageTextItems(pdf, pageNum, viewport) {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();
  const items = [];

  for (const i of content.items) {
    if (!i.str || !i.str.trim()) continue;

    // Transform item position to viewport coordinates
    const tx = pdfjsLib.Util.transform(viewport.transform, i.transform);
    const runX = tx[4];
    const runY = tx[5] - i.height * viewport.scale;
    const runW = i.width * viewport.scale;
    const runH = i.height * viewport.scale;

    // Split multi-word runs into per-word items with proportional widths.
    // pdf.js gives us the whole text-run as one item; we synthesize per-word
    // bboxes so word-by-word highlighting works.
    const words = i.str.match(/\S+\s*/g) || [i.str];

    if (words.length === 1 && !/\s/.test(i.str)) {
      // Single word, no splitting needed
      items.push({ text: i.str, x: runX, y: runY, w: runW, h: runH });
      continue;
    }

    // Proportionally distribute width across words, weighted by character count
    // (imperfect but close enough — real per-character widths would require
    // measuring each glyph, which pdf.js doesn't expose without extra work).
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    let cursorX = runX;
    for (const w of words) {
      const wWidth = (w.length / totalChars) * runW;
      const trimmed = w.replace(/\s+$/, '');
      if (trimmed) {
        // The visible word occupies the non-trailing-whitespace portion
        const trimmedWidth = (trimmed.length / totalChars) * runW;
        items.push({
          text: trimmed,
          x: cursorX,
          y: runY,
          w: trimmedWidth,
          h: runH,
        });
      }
      cursorX += wWidth;
    }
  }

  return items;
}

// Render one page to a supplied canvas at the given scale.
// Returns the viewport used (for coordinate conversions).
export async function renderPage(pdf, pageNum, canvas, scale = 1.5) {
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { page, viewport };
}

// Detect image "zones" on a page — bounding boxes of raster images.
// We walk the operator list and track the current transform matrix
// so we know where each image is drawn.
// Returns array of { pageNum, kind: 'image', bbox: {x, y, w, h}, imgName }
// bbox is in the SAME coordinates as the viewport passed in.
export async function detectImageZones(pdf, pageNum, viewport) {
  const page = await pdf.getPage(pageNum);
  const ops = await page.getOperatorList();
  const zones = [];
  const seen = new Set();

  // Track the current CTM (current transformation matrix) so we can
  // compute the actual on-page position of each painted image.
  // pdf.js uses a 6-value affine matrix [a, b, c, d, e, f].
  const stack = [];
  let ctm = [1, 0, 0, 1, 0, 0];

  const multiply = (a, b) => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];

  const OPS = pdfjsLib.OPS;

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = ops.argsArray[i];

    if (fn === OPS.save) stack.push([...ctm]);
    else if (fn === OPS.restore) ctm = stack.pop() || ctm;
    else if (fn === OPS.transform) ctm = multiply(ctm, args);
    else if (
      fn === OPS.paintImageXObject ||
      fn === OPS.paintJpegXObject ||
      fn === OPS.paintInlineImage
    ) {
      const imgName = args?.[0];
      if (seen.has(imgName)) continue;
      seen.add(imgName);

      // Image is drawn in a unit square (0,0) → (1,1) transformed by ctm.
      // Corners of the unit square in page coordinates:
      const corners = [
        [ctm[4], ctm[5]],
        [ctm[0] + ctm[4], ctm[1] + ctm[5]],
        [ctm[2] + ctm[4], ctm[3] + ctm[5]],
        [ctm[0] + ctm[2] + ctm[4], ctm[1] + ctm[3] + ctm[5]],
      ];
      const xs = corners.map(c => c[0]);
      const ys = corners.map(c => c[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      const w = Math.max(...xs) - x;
      const h = Math.max(...ys) - y;

      if (w < 20 || h < 20) continue; // skip tiny inline glyphs

      // Convert to viewport coordinates
      const [vx, vy] = viewport.convertToViewportPoint(x, y + h);
      const [vx2, vy2] = viewport.convertToViewportPoint(x + w, y);

      zones.push({
        pageNum,
        kind: 'image',
        imgName,
        bbox: {
          x: Math.min(vx, vx2),
          y: Math.min(vy, vy2),
          w: Math.abs(vx2 - vx),
          h: Math.abs(vy2 - vy),
        },
      });
    }
  }

  return zones;
}

// Detect table zones by finding "Table N." captions in text content
// and estimating the region below the caption.
export async function detectTableZones(pdf, pageNum, viewport) {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();
  const zones = [];

  const items = content.items
    .filter(i => i.str && i.str.trim())
    .map(i => {
      const [vx, vy] = viewport.convertToViewportPoint(i.transform[4], i.transform[5]);
      return { text: i.str, x: vx, y: vy, height: i.height * viewport.scale };
    });

  const captions = items.filter(i => /^Table\s+\d+[.:]/i.test(i.text.trim()));

  for (let ci = 0; ci < captions.length; ci++) {
    const cap = captions[ci];
    const nextCapY = ci + 1 < captions.length ? captions[ci + 1].y : viewport.height;

    // Find text items below this caption up to next caption or a gap
    const below = items
      .filter(i => i.y > cap.y && i.y < nextCapY)
      .sort((a, b) => a.y - b.y);

    let bottomY = cap.y;
    let lastY = cap.y;
    for (const it of below) {
      if (it.y - lastY > 40) break;
      lastY = it.y;
      bottomY = it.y + it.height;
    }

    // Estimate table width: full page width minus margins
    const x = 40;
    const w = viewport.width - 80;
    const y = cap.y - cap.height - 4;
    const h = Math.max(60, bottomY - y + 10);

    zones.push({
      pageNum,
      kind: 'table',
      label: cap.text,
      bbox: { x, y, w, h },
    });
  }

  return zones;
}
