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
// Text extraction with two-column handling
// -----------------------------------------------------------------
async function extractPageText(page) {
  const content = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const pageWidth = viewport.width;

  // Items have transform [a, b, c, d, x, y] — x,y is bottom-left of the text.
  // Sort by column (left half vs right half) then by y (top to bottom).
  const items = content.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({
      text: i.str,
      x: i.transform[4],
      y: viewport.height - i.transform[5], // flip so y=0 is top
      height: i.height,
    }));

  // Detect if two-column: are there items in both left and right halves?
  const mid = pageWidth / 2;
  const leftCount = items.filter(i => i.x < mid).length;
  const rightCount = items.filter(i => i.x >= mid).length;
  const twoColumn = leftCount > 20 && rightCount > 20;

  let sorted;
  if (twoColumn) {
    const left = items.filter(i => i.x < mid).sort((a, b) => a.y - b.y || a.x - b.x);
    const right = items.filter(i => i.x >= mid).sort((a, b) => a.y - b.y || a.x - b.x);
    sorted = [...left, ...right];
  } else {
    sorted = items.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  // Reassemble into lines using y-proximity
  const lines = [];
  let currentLine = [];
  let lastY = null;
  const lineThreshold = 4;
  for (const item of sorted) {
    if (lastY === null || Math.abs(item.y - lastY) < lineThreshold) {
      currentLine.push(item);
    } else {
      if (currentLine.length) lines.push(currentLine);
      currentLine = [item];
    }
    lastY = item.y;
  }
  if (currentLine.length) lines.push(currentLine);

  const lineTexts = lines.map(line =>
    line.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').replace(/\s+/g, ' ').trim()
  );

  // Detect figure captions on this page: lines that start with "Figure N."
  const captions = [];
  lineTexts.forEach((text, idx) => {
    const match = text.match(/^(Figure\s+\d+[.:])/i);
    if (match) {
      // Take this line plus the next 1-2 lines as the caption
      const captionText = [text, lineTexts[idx + 1], lineTexts[idx + 2]]
        .filter(Boolean)
        .join(' ')
        .slice(0, 300);
      const y = lines[idx][0].y;
      captions.push({ text: captionText, y });
    }
  });

  return { text: lineTexts.join('\n'), captions };
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
