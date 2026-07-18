// PDF extraction: text (reading order) + images (grouped by figure caption).
// Uses pdfjs-dist. Loads the worker from the same package via a Vite ?url import.

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// -----------------------------------------------------------------
// Main entry
// -----------------------------------------------------------------
export async function extractPdf(file, onProgress = () => {}) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  onProgress({ stage: 'text', pageIndex: 0, numPages });

  // ---- Pass 1: extract text page-by-page in reading order ----
  const pageTexts = [];
  const pageCaptions = []; // per-page list of { text, y }
  for (let p = 1; p <= numPages; p++) {
    const page = await pdf.getPage(p);
    const { text, captions } = await extractPageText(page);
    pageTexts.push(text);
    pageCaptions.push(captions);
    await page.cleanup();
    onProgress({ stage: 'text', pageIndex: p, numPages });
  }

  const fullText = pageTexts.join('\n\n');

  // ---- Pass 2: extract images per page, group by caption ----
  onProgress({ stage: 'images', pageIndex: 0, numPages });
  const figures = []; // [{ caption, pageNum, images: [{ url, label }] }]
  for (let p = 1; p <= numPages; p++) {
    const page = await pdf.getPage(p);
    const pageImages = await extractPageImages(page);
    if (pageImages.length > 0) {
      const captions = pageCaptions[p - 1];
      const grouped = groupImagesByCaption(pageImages, captions, p);
      figures.push(...grouped);
    }
    await page.cleanup();
    onProgress({ stage: 'images', pageIndex: p, numPages });
  }

  onProgress({ stage: 'done', numPages });

  return { fullText, figures, numPages };
}

// -----------------------------------------------------------------
// Text extraction with column handling + glyph-spacing repair
// -----------------------------------------------------------------
async function extractPageText(page) {
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const pageWidth = viewport.width;

  const items = content.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({
      text: i.str,
      x: i.transform[4],
      y: viewport.height - i.transform[5],
      width: i.width || (i.str.length * 5),
      height: i.height,
    }));

  // Detect column boundaries by looking at x-position histogram.
  // NEJM often has: narrow sidebar + wide body, OR two roughly equal columns,
  // OR single column (title pages, figure pages).
  const columnBounds = detectColumns(items, pageWidth);

  // Assign each item to a column, then sort within each column by y then x
  const columnBuckets = columnBounds.map(() => []);
  for (const item of items) {
    const colIdx = columnBounds.findIndex(b => item.x + item.width / 2 >= b.start && item.x + item.width / 2 < b.end);
    if (colIdx >= 0) columnBuckets[colIdx].push(item);
    else columnBuckets[columnBuckets.length - 1].push(item);
  }

  const sorted = [];
  for (const bucket of columnBuckets) {
    bucket.sort((a, b) => a.y - b.y || a.x - b.x);
    sorted.push(...bucket);
  }

  // Reassemble into lines using y-proximity within a column
  const lines = [];
  let currentLine = [];
  let lastY = null;
  let lastCol = null;
  const lineThreshold = 4;
  for (const item of sorted) {
    // Determine which column this item belongs to (for line-break logic)
    const col = columnBounds.findIndex(b => item.x + item.width / 2 >= b.start && item.x + item.width / 2 < b.end);
    if (lastY === null || (col === lastCol && Math.abs(item.y - lastY) < lineThreshold)) {
      currentLine.push(item);
    } else {
      if (currentLine.length) lines.push(currentLine);
      currentLine = [item];
    }
    lastY = item.y;
    lastCol = col;
  }
  if (currentLine.length) lines.push(currentLine);

  // Build line texts. NO glyph-spacing repair here — let the Worker handle
  // fuzzy matching against ornamental headers using space-insensitive regex.
  const lineTexts = lines.map(line =>
    line.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()
  );

  // Detect figure captions
  const captions = [];
  lineTexts.forEach((text, idx) => {
    const match = text.match(/^(Figure\s+\d+[.:])/i);
    if (match) {
      const captionText = [text, lineTexts[idx + 1], lineTexts[idx + 2]]
        .filter(Boolean).join(' ').slice(0, 300);
      const y = lines[idx][0].y;
      captions.push({ text: captionText, y });
    }
  });

  return { text: lineTexts.join('\n'), captions };
}

// Detect column layout from item x-positions.
// Returns array of {start, end} intervals.
function detectColumns(items, pageWidth) {
  if (items.length < 20) return [{ start: 0, end: pageWidth }];

  // Build histogram of x-positions in 30px buckets
  const bucketSize = 30;
  const buckets = new Array(Math.ceil(pageWidth / bucketSize)).fill(0);
  for (const item of items) {
    const idx = Math.floor(item.x / bucketSize);
    if (idx >= 0 && idx < buckets.length) buckets[idx]++;
  }

  // Find "gaps" — buckets with few items surrounded by populated ones
  // A column boundary is a run of low-density buckets between high-density regions
  const threshold = Math.max(2, items.length / 100);
  const isDense = buckets.map(c => c > threshold);

  // Find contiguous dense regions = columns
  const columns = [];
  let start = null;
  for (let i = 0; i < isDense.length; i++) {
    if (isDense[i] && start === null) start = i;
    else if (!isDense[i] && start !== null) {
      columns.push({ startBucket: start, endBucket: i });
      start = null;
    }
  }
  if (start !== null) columns.push({ startBucket: start, endBucket: isDense.length });

  // Merge columns that are very close together (< 2 buckets apart)
  const merged = [];
  for (const col of columns) {
    const last = merged[merged.length - 1];
    if (last && col.startBucket - last.endBucket < 3) {
      last.endBucket = col.endBucket;
    } else {
      merged.push({ ...col });
    }
  }

  if (merged.length === 0) return [{ start: 0, end: pageWidth }];

  // Convert to x-position ranges, extending each to cover the gap to the next column
  const result = [];
  for (let i = 0; i < merged.length; i++) {
    const col = merged[i];
    const s = col.startBucket * bucketSize;
    const e = i + 1 < merged.length
      ? ((col.endBucket + merged[i + 1].startBucket) / 2) * bucketSize
      : pageWidth;
    const prevEnd = result.length > 0 ? result[result.length - 1].end : 0;
    result.push({ start: Math.max(prevEnd, i === 0 ? 0 : s - bucketSize), end: e });
  }
  return result;
}

// Repair text where PDF.js extracted glyphs with spaces between them due to
// small-caps or ornamental typography. NOT currently used — the Worker's
// fuzzy matching handles this better because it uses space-insensitive regex.
// Kept here in case we need item-level repair later.
function repairGlyphSpacing_unused(text) {
  return text;
}

// -----------------------------------------------------------------
// Image extraction — walks the page's operator list, pulls out raster images
// -----------------------------------------------------------------
async function extractPageImages(page) {
  const ops = await page.getOperatorList();
  const images = [];
  const seen = new Set();

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    // paintImageXObject or paintInlineImageXObject or paintJpegXObject
    if (
      fn === pdfjsLib.OPS.paintImageXObject ||
      fn === pdfjsLib.OPS.paintInlineImage ||
      fn === pdfjsLib.OPS.paintJpegXObject
    ) {
      const args = ops.argsArray[i];
      const imgName = args?.[0];
      if (!imgName || seen.has(imgName)) continue;
      seen.add(imgName);

      try {
        // Get image bytes from the page's object store.
        // Different pdf.js builds expose this differently; try both APIs.
        const imgObj = await getImageObject(page, imgName);
        if (!imgObj) continue;

        const dataUrl = await imgObjectToDataUrl(imgObj);
        if (dataUrl) {
          // Estimate y position on page using the CTM state at this op.
          // We don't fully track state — approximate as unknown (null).
          images.push({ url: dataUrl, name: imgName, y: null, width: imgObj.width, height: imgObj.height });
        }
      } catch (e) {
        // Skip images we can't extract (vector graphics, etc.)
        console.warn(`Skipping image ${imgName}:`, e.message);
      }
    }
  }

  return images;
}

function getImageObject(page, name) {
  return new Promise((resolve) => {
    // pdf.js exposes page.objs.get(name, callback) OR .get(name) that returns a promise
    try {
      const objs = page.objs;
      if (objs.has && objs.has(name)) {
        objs.get(name, (obj) => resolve(obj));
      } else {
        objs.get(name, (obj) => resolve(obj));
      }
    } catch (e) {
      resolve(null);
    }
  });
}

async function imgObjectToDataUrl(imgObj) {
  // imgObj typically has { data: Uint8ClampedArray, width, height, kind }
  // where kind is 1 (grayscale), 2 (RGB), 3 (RGBA)
  const { width, height, data, kind, bitmap } = imgObj;

  // Some images come as an ImageBitmap directly
  if (bitmap) {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL('image/png');
  }

  if (!data || !width || !height) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(width, height);

  // Normalize to RGBA
  if (kind === 3 || data.length === width * height * 4) {
    // Already RGBA
    imageData.data.set(data);
  } else if (kind === 2 || data.length === width * height * 3) {
    // RGB → RGBA
    for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
      imageData.data[j] = data[i];
      imageData.data[j + 1] = data[i + 1];
      imageData.data[j + 2] = data[i + 2];
      imageData.data[j + 3] = 255;
    }
  } else if (kind === 1 || data.length === width * height) {
    // Grayscale → RGBA
    for (let i = 0, j = 0; i < data.length; i++, j += 4) {
      imageData.data[j] = data[i];
      imageData.data[j + 1] = data[i];
      imageData.data[j + 2] = data[i];
      imageData.data[j + 3] = 255;
    }
  } else {
    return null;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// -----------------------------------------------------------------
// Group images on a page by their nearest figure caption
// -----------------------------------------------------------------
function groupImagesByCaption(pageImages, captions, pageNum) {
  if (captions.length === 0) {
    // No caption on this page — treat all images as one anonymous figure
    return [{
      caption: `Page ${pageNum} (no caption)`,
      pageNum,
      images: pageImages.map((img, i) => ({ url: img.url, label: `Panel ${i + 1}` })),
    }];
  }
  // Simple: if there's one caption, all images belong to it
  if (captions.length === 1) {
    return [{
      caption: captions[0].text,
      pageNum,
      images: pageImages.map((img, i) => ({
        url: img.url,
        label: pageImages.length > 1 ? `Panel ${String.fromCharCode(65 + i)}` : '',
      })),
    }];
  }
  // Multiple captions on one page: split images by y-position
  // (fallback: distribute images evenly among captions)
  const perCaption = Math.ceil(pageImages.length / captions.length);
  return captions.map((cap, idx) => {
    const start = idx * perCaption;
    const chunk = pageImages.slice(start, start + perCaption);
    return {
      caption: cap.text,
      pageNum,
      images: chunk.map((img, i) => ({
        url: img.url,
        label: chunk.length > 1 ? `Panel ${String.fromCharCode(65 + i)}` : '',
      })),
    };
  });
}
