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

  // Pass 1: text
  const pageTexts = [];
  const pageCaptions = [];
  const pageTableCaptions = []; // NEW: table captions with their y-coordinates
  for (let p = 1; p <= numPages; p++) {
    const page = await pdf.getPage(p);
    const { text, captions, tableCaptions } = await extractPageText(page);
    pageTexts.push(text);
    pageCaptions.push(captions);
    pageTableCaptions.push(tableCaptions);
    await page.cleanup();
    onProgress({ stage: 'text', pageIndex: p, numPages });
  }
  const fullText = pageTexts.join('\n\n');

  // Pass 2: figure images (unchanged)
  onProgress({ stage: 'images', pageIndex: 0, numPages });
  const figures = [];
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

  // Pass 3: tables — render page regions with "Table N." captions
  onProgress({ stage: 'tables', pageIndex: 0, numPages });
  const tables = [];
  for (let p = 1; p <= numPages; p++) {
    if (pageTableCaptions[p - 1].length === 0) continue;
    const page = await pdf.getPage(p);
    const pageTables = await extractPageTables(page, pageTableCaptions[p - 1]);
    tables.push(...pageTables.map(t => ({ ...t, pageNum: p })));
    await page.cleanup();
    onProgress({ stage: 'tables', pageIndex: p, numPages });
  }

  onProgress({ stage: 'done', numPages });

  return { fullText, figures, tables, numPages };
}

// ----- MODIFY extractPageText() -----
// It currently returns { text, captions }. Add tableCaptions detection.
// The relevant new block goes inside the function; here's the full replacement:

async function extractPageText(page) {
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const pageWidth = viewport.width;
  const pageHeight = viewport.height;

  const items = content.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({
      text: i.str,
      x: i.transform[4],
      y: viewport.height - i.transform[5],
      width: i.width || (i.str.length * 5),
      height: i.height,
    }));

  const columnBounds = detectColumns(items, pageWidth);

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

  const lines = [];
  let currentLine = [];
  let lastY = null;
  let lastCol = null;
  const lineThreshold = 4;
  for (const item of sorted) {
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

const lineTexts = lines.map(line =>
  line.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()
).map(repairSpacedGlyphs);

  // Figure captions (unchanged)
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

  // NEW: Table captions
  const tableCaptions = [];
  lineTexts.forEach((text, idx) => {
    const match = text.match(/^Table\s+(\d+)[.:](.*)$/i);
    if (match) {
      // Grab caption text (this line + maybe the next short line for the title)
      const nextLine = lineTexts[idx + 1] || '';
      const captionText = (text + (nextLine.length < 80 ? ' ' + nextLine : '')).slice(0, 200);
      const y = lines[idx][0].y;
      // Also find the x — we need the leftmost x of this line for cropping
      const x = Math.min(...lines[idx].map(i => i.x));
      tableCaptions.push({
        number: match[1],
        text: captionText,
        y,
        x,
        pageHeight,
        pageWidth,
      });
    }
  });


  
  return { text: isolateSectionHeaders(lineTexts.join('\n')), captions, tableCaptions };
}



// ============================================================
// Table extraction: render each table caption's page region to a canvas
// ============================================================
async function extractPageTables(page, tableCaptions) {
  // Render the whole page at 2x resolution for readability, then crop
  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // For each table caption, crop from the caption's y down to either:
  //   - the y of the next table caption on the same page, OR
  //   - the bottom of the page, OR
  //   - a heuristic: stop when we hit a large blank stripe (>40px of no text)
  //
  // We use the caption Y as the TOP of the crop (caption sits above the table),
  // and estimate table height by finding text density below it.
  const tables = [];
  const textContent = await page.getTextContent();
  const itemsByY = textContent.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({
      y: viewport.height / scale - i.transform[5], // in scale=1 units
      x: i.transform[4],
      text: i.str,
    }))
    .sort((a, b) => a.y - b.y);

  for (let i = 0; i < tableCaptions.length; i++) {
    const cap = tableCaptions[i];
    const nextCapY = i + 1 < tableCaptions.length ? tableCaptions[i + 1].y : cap.pageHeight;

    // Find bottom of this table: scan downward from caption.y and find the last
    // y where there's still text before hitting a >30px gap OR hitting nextCapY
    const startY = cap.y - 8; // include the caption itself
    let lastTextY = cap.y;
    for (const item of itemsByY) {
      if (item.y <= cap.y) continue;
      if (item.y >= nextCapY) break;
      if (item.y - lastTextY > 30) break; // gap → end of table
      lastTextY = item.y;
    }
    const endY = Math.min(lastTextY + 15, nextCapY, cap.pageHeight);

    // Convert to scaled pixel coordinates
    const cropTop = Math.max(0, startY * scale);
    const cropBottom = Math.min(canvas.height, endY * scale);
    const cropHeight = cropBottom - cropTop;
    if (cropHeight < 40) continue; // too small, skip

    // Crop the full page width (tables typically span the column or the whole page)
    // To be safe, crop the full page width — the table centers itself in view
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = canvas.width;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.fillStyle = 'white';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(
      canvas,
      0, cropTop, canvas.width, cropHeight,
      0, 0, canvas.width, cropHeight
    );

    const url = cropCanvas.toDataURL('image/png');
    tables.push({
      number: cap.number,
      caption: cap.text,
      url,
    });
  }

  return tables;
}

function repairSpacedGlyphs(line) {
  if (!line || line.length < 6) return line;
  const words = line.split(/\s+/);
  if (words.length < 4) return line;
  const shortWords = words.filter(w => w.length <= 2).length;
  if (shortWords / words.length < 0.5) return line;
  const squashed = words.join('');
  const letterRatio = (squashed.match(/[a-zA-Z]/g) || []).length / squashed.length;
  if (letterRatio < 0.8) return line;
  return squashed.replace(/([a-z])([A-Z])/g, '$1 $2');
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
