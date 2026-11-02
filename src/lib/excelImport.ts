import * as XLSX from 'xlsx';
import { Service } from '../types';
import {
  normalizeImageUrl,
  resolveServiceImage,
  resolveYandexDiskImageUrl,
} from './media';

export interface ParsedExcelRowPreview {
  rowIndex: number;
  sheetName: string;
  category: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  duration?: string;
  rawImage: string;
  hasCustomPhoto: boolean;
}

export interface ParsedExcelSheetData {
  sheetName: string;
  headers: string[];
  headerRowIndex: number;
  rows: any[][];
  rowImages: Record<number, string>;
  cellHyperlinks: Record<string, string>;
  suggestedMapping: {
    category: string;
    name: string;
    description: string;
    price: string;
    oldPrice: string;
    duration: string;
    image: string;
  };
}

export interface ParsedExcelWorkbookResult {
  sheets: ParsedExcelSheetData[];
  embeddedImagesCount: number;
  unassignedMediaQueue: string[];
}

interface ZipEntry {
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/**
 * Parses the ZIP Central Directory of an .xlsx file in browser memory.
 */
function parseZipEntries(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const view = new DataView(buffer);
  const entries = new Map<string, ZipEntry>();
  const len = buffer.byteLength;

  if (len < 22) return entries;

  // Verify PK signature at start
  if (view.getUint32(0, true) !== 0x04034b50) {
    return entries;
  }

  // Locate End of Central Directory (EOCD) signature 0x06054b50
  let eocdOffset = -1;
  const minOffset = Math.max(0, len - 65557);
  for (let i = len - 22; i >= minOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) return entries;

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);

  let ptr = cdOffset;
  const decoder = new TextDecoder('utf-8');

  for (let i = 0; i < totalEntries && ptr + 46 <= len; i++) {
    const sig = view.getUint32(ptr, true);
    if (sig !== 0x02014b50) break;

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const uncompressedSize = view.getUint32(ptr + 24, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const fileNameBytes = new Uint8Array(buffer, ptr + 46, fileNameLen);
    const fileName = decoder.decode(fileNameBytes);

    entries.set(fileName, {
      fileName,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    ptr += 46 + fileNameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Extracts and decompresses a single file entry from the .xlsx ZIP buffer.
 */
async function extractZipEntryBytes(
  buffer: ArrayBuffer,
  entry: ZipEntry
): Promise<Uint8Array | null> {
  try {
    const view = new DataView(buffer);
    const lhOffset = entry.localHeaderOffset;
    if (lhOffset + 30 > buffer.byteLength) return null;

    if (view.getUint32(lhOffset, true) !== 0x04034b50) return null;

    const fileNameLen = view.getUint16(lhOffset + 26, true);
    const extraLen = view.getUint16(lhOffset + 28, true);
    const dataStart = lhOffset + 30 + fileNameLen + extraLen;

    if (dataStart + entry.compressedSize > buffer.byteLength) return null;

    const compressedSlice = new Uint8Array(buffer, dataStart, entry.compressedSize);

    if (entry.compressionMethod === 0) {
      return compressedSlice;
    }

    if (entry.compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedSlice).catch(() => {});
      writer.close().catch(() => {});

      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalLen = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLen += value.byteLength;
        }
      }

      const result = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return result;
    }

    return null;
  } catch {
    return null;
  }
}

async function extractZipEntryText(
  buffer: ArrayBuffer,
  entry: ZipEntry
): Promise<string> {
  const bytes = await extractZipEntryBytes(buffer, entry);
  if (!bytes) return '';
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Compresses raw binary image bytes from xl/media/* into a compact JPEG Data URL (~20-35KB)
 * so that dozens of service photos can be saved in Firestore and localStorage without quota issues.
 */
function compressMediaBytesToDataUrl(
  bytes: Uint8Array,
  fileName: string,
  maxWidth = 640,
  maxHeight = 440,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpeg';
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
        ? 'image/webp'
        : ext === 'gif'
        ? 'image/gif'
        : ext === 'svg'
        ? 'image/svg+xml'
        : 'image/jpeg';

    const blob = new Blob([bytes], { type: mime });
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width || 640;
        let height = img.naturalHeight || img.height || 440;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve('');
          return;
        }
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    img.src = objectUrl;
  });
}

function normalizeZipPath(baseDir: string, target: string): string {
  if (!target) return '';
  if (target.startsWith('/')) return target.slice(1);
  const parts = [...baseDir.split('/').filter(Boolean), ...target.split('/').filter(Boolean)];
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}

function parseRelsXml(xml: string, baseDir: string): Record<string, string> {
  const map: Record<string, string> = {};
  const relRegex = /<Relationship\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = relRegex.exec(xml)) !== null) {
    const tag = match[0];
    const idMatch = tag.match(/\bId=["']([^"']+)["']/i);
    const targetMatch = tag.match(/\bTarget=["']([^"']+)["']/i);
    const modeMatch = tag.match(/\bTargetMode=["']([^"']+)["']/i);
    if (idMatch && targetMatch) {
      const id = idMatch[1];
      const rawTarget = targetMatch[1];
      if (modeMatch && /External/i.test(modeMatch[1])) {
        map[id] = rawTarget;
      } else if (/^https?:\/\//i.test(rawTarget)) {
        map[id] = rawTarget;
      } else {
        map[id] = normalizeZipPath(baseDir, rawTarget);
      }
    }
  }
  return map;
}

interface ExtractedXlsxMedia {
  /** sheetIndex (0-based) -> rowIndex (0-based) -> dataUrl */
  sheetRowImages: Record<number, Record<number, string>>;
  /** DISPIMG ID (e.g. "ID_XXXX") -> dataUrl */
  dispImgMap: Record<string, string>;
  /** sheetIndex (0-based) -> cellRef (e.g. "E2") -> dataUrl (from Excel 365 RichData vm attribute) */
  sheetCellRichImages: Record<number, Record<string, string>>;
  /** All media dataUrls in sequential order */
  allMediaList: string[];
}

/**
 * Extracts all embedded images from an .xlsx file (floating drawings, DISPIMG in-cell images,
 * and Excel 365 RichData in-cell images) and maps them to their corresponding sheet & row.
 */
async function extractEmbeddedImagesFromXlsx(
  buffer: ArrayBuffer
): Promise<ExtractedXlsxMedia> {
  const result: ExtractedXlsxMedia = {
    sheetRowImages: {},
    dispImgMap: {},
    sheetCellRichImages: {},
    allMediaList: [],
  };

  const entries = parseZipEntries(buffer);
  if (entries.size === 0) return result;

  // 1. Decompress & compress all xl/media/* image files
  const mediaEntries = Array.from(entries.values())
    .filter((e) => /^xl\/media\/[^/]+\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(e.fileName))
    .sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));

  if (mediaEntries.length === 0) return result;

  const mediaDataUrlMap: Record<string, string> = {};
  for (const mediaEntry of mediaEntries) {
    const bytes = await extractZipEntryBytes(buffer, mediaEntry);
    if (bytes && bytes.byteLength > 0) {
      const dataUrl = await compressMediaBytesToDataUrl(bytes, mediaEntry.fileName);
      if (dataUrl) {
        mediaDataUrlMap[mediaEntry.fileName] = dataUrl;
        result.allMediaList.push(dataUrl);
      }
    }
  }

  // 2. Parse WPS / Excel DISPIMG cellimages.xml + _rels/cellimages.xml.rels
  const cellImagesEntry = entries.get('xl/cellimages.xml');
  const cellImagesRelsEntry = entries.get('xl/_rels/cellimages.xml.rels');
  if (cellImagesEntry && cellImagesRelsEntry) {
    const [cellImagesXml, cellImagesRelsXml] = await Promise.all([
      extractZipEntryText(buffer, cellImagesEntry),
      extractZipEntryText(buffer, cellImagesRelsEntry),
    ]);
    const relsMap = parseRelsXml(cellImagesRelsXml, 'xl');
    const cellImgBlocks = cellImagesXml.match(/<(?:\w+:)?cellImage\b[\s\S]*?<\/(?:\w+:)?cellImage>/gi) || [];
    for (const block of cellImgBlocks) {
      const nameMatch = block.match(/\bname=["']([^"']+)["']/i);
      const embedMatch = block.match(/\b(?:r:)?embed=["']([^"']+)["']/i);
      if (nameMatch && embedMatch) {
        const imgId = nameMatch[1];
        const rId = embedMatch[1];
        const targetPath = relsMap[rId];
        const resolved = targetPath ? mediaDataUrlMap[targetPath] || targetPath : '';
        if (resolved) {
          result.dispImgMap[imgId] = resolved;
        }
      }
    }
  }

  // 3. Parse Excel 365 RichData in-cell images (xl/richData/richValueRel.xml)
  const richRelEntry = entries.get('xl/richData/richValueRel.xml');
  const richRelRelsEntry = entries.get('xl/richData/_rels/richValueRel.xml.rels');
  const richImagesOrdered: string[] = [];
  if (richRelEntry && richRelRelsEntry) {
    const [richRelXml, richRelRelsXml] = await Promise.all([
      extractZipEntryText(buffer, richRelEntry),
      extractZipEntryText(buffer, richRelRelsEntry),
    ]);
    const relsMap = parseRelsXml(richRelRelsXml, 'xl/richData');
    const relMatches = richRelXml.match(/<(?:\w+:)?rel\b[^>]*>/gi) || [];
    for (const relTag of relMatches) {
      const rIdMatch = relTag.match(/\b(?:r:)?id=["']([^"']+)["']/i);
      if (rIdMatch) {
        const target = relsMap[rIdMatch[1]];
        const imgData = target ? mediaDataUrlMap[target] || '' : '';
        richImagesOrdered.push(imgData);
      }
    }
  }

  // 4. Map sheets -> drawings & RichData vm cells
  const sheetEntries = Array.from(entries.values())
    .filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.fileName))
    .sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));

  for (let sheetIdx = 0; sheetIdx < sheetEntries.length; sheetIdx++) {
    const sheetEntry = sheetEntries[sheetIdx];
    const sheetXml = await extractZipEntryText(buffer, sheetEntry);
    result.sheetRowImages[sheetIdx] = {};
    result.sheetCellRichImages[sheetIdx] = {};

    // 4a. Check cells with vm="..." attribute for Excel 365 in-cell images
    if (richImagesOrdered.length > 0) {
      const cellTagRegex = /<c\b[^>]*\bvm=["'](\d+)["'][^>]*>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellTagRegex.exec(sheetXml)) !== null) {
        const tag = cellMatch[0];
        const vmIdx = parseInt(cellMatch[1], 10);
        const refMatch = tag.match(/\br=["']([A-Z]+\d+)["']/i);
        if (refMatch && !isNaN(vmIdx)) {
          const cellRef = refMatch[1].toUpperCase();
          const rowNumMatch = cellRef.match(/(\d+)$/);
          const row0 = rowNumMatch ? parseInt(rowNumMatch[1], 10) - 1 : -1;
          // vm is typically 1-based index into richValueRel
          const img = richImagesOrdered[vmIdx - 1] || richImagesOrdered[vmIdx] || '';
          if (img) {
            result.sheetCellRichImages[sheetIdx][cellRef] = img;
            if (row0 >= 0 && !result.sheetRowImages[sheetIdx][row0]) {
              result.sheetRowImages[sheetIdx][row0] = img;
            }
          }
        }
      }
    }

    // 4b. Find drawing file for this worksheet
    const sheetBaseName = sheetEntry.fileName.split('/').pop() || '';
    const sheetRelsPath = `xl/worksheets/_rels/${sheetBaseName}.rels`;
    const sheetRelsEntry = entries.get(sheetRelsPath);
    let drawingPath = `xl/drawings/drawing${sheetIdx + 1}.xml`;

    if (sheetRelsEntry) {
      const sheetRelsXml = await extractZipEntryText(buffer, sheetRelsEntry);
      const sheetRelsMap = parseRelsXml(sheetRelsXml, 'xl/worksheets');
      const drawingTagMatch = sheetXml.match(/<(?:\w+:)?drawing\b[^>]*\b(?:r:)?id=["']([^"']+)["']/i);
      if (drawingTagMatch && sheetRelsMap[drawingTagMatch[1]]) {
        drawingPath = sheetRelsMap[drawingTagMatch[1]];
      } else {
        const foundDrawing = Object.values(sheetRelsMap).find((p) => /xl\/drawings\/drawing\d+\.xml$/i.test(p));
        if (foundDrawing) drawingPath = foundDrawing;
      }
    }

    const drawingEntry = entries.get(drawingPath);
    if (!drawingEntry) continue;

    const drawingBaseName = drawingPath.split('/').pop() || '';
    const drawingRelsPath = `xl/drawings/_rels/${drawingBaseName}.rels`;
    const drawingRelsEntry = entries.get(drawingRelsPath);

    const [drawingXml, drawingRelsXml] = await Promise.all([
      extractZipEntryText(buffer, drawingEntry),
      drawingRelsEntry ? extractZipEntryText(buffer, drawingRelsEntry) : Promise.resolve(''),
    ]);

    const drawingRelsMap = parseRelsXml(drawingRelsXml, 'xl/drawings');

    // Parse all twoCellAnchor and oneCellAnchor blocks
    const anchorRegex = /<(?:\w+:)?(?:twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/(?:\w+:)?(?:twoCellAnchor|oneCellAnchor)>/gi;
    const anchors: Array<{
      fromRow: number;
      fromRowOff: number;
      toRow: number;
      toRowOff: number;
      sortPos: number;
      imageSrc: string;
    }> = [];

    let anchorMatch: RegExpExecArray | null;
    while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
      const block = anchorMatch[0];
      const fromBlock = block.match(/<(?:\w+:)?from\b[\s\S]*?<\/(?:\w+:)?from>/i)?.[0] || '';
      const toBlock = block.match(/<(?:\w+:)?to\b[\s\S]*?<\/(?:\w+:)?to>/i)?.[0] || '';

      const fromRowStr = fromBlock.match(/<(?:\w+:)?row>(\d+)<\/(?:\w+:)?row>/i)?.[1];
      const fromRowOffStr = fromBlock.match(/<(?:\w+:)?rowOff>(\d+)<\/(?:\w+:)?rowOff>/i)?.[1];
      const toRowStr = toBlock.match(/<(?:\w+:)?row>(\d+)<\/(?:\w+:)?row>/i)?.[1];
      const toRowOffStr = toBlock.match(/<(?:\w+:)?rowOff>(\d+)<\/(?:\w+:)?rowOff>/i)?.[1];

      if (!fromRowStr) continue;
      const fromRow = parseInt(fromRowStr, 10);
      const fromRowOff = fromRowOffStr ? parseInt(fromRowOffStr, 10) : 0;
      const toRow = toRowStr ? parseInt(toRowStr, 10) : fromRow;
      const toRowOff = toRowOffStr ? parseInt(toRowOffStr, 10) : 0;

      // Find blip r:embed or r:link
      const blipMatch = block.match(/<(?:\w+:)?blip\b[^>]*\b(?:r:)?(?:embed|link)=["']([^"']+)["']/i);
      if (!blipMatch) continue;

      const rId = blipMatch[1];
      const target = drawingRelsMap[rId];
      if (!target) continue;

      const imageSrc = mediaDataUrlMap[target] || (/^https?:\/\//i.test(target) ? target : '');
      if (!imageSrc) continue;

      // Calculate effective row position:
      // If an image starts near the bottom of row R-1 (large fromRowOff) and ends well inside row R,
      // its visual center is in row R.
      let primaryRow = fromRow;
      if (toRow > fromRow && fromRowOff > 95000 && toRowOff > 95000) {
        primaryRow = Math.round((fromRow + toRow) / 2);
      }

      anchors.push({
        fromRow: primaryRow,
        fromRowOff,
        toRow: Math.max(primaryRow, toRow),
        toRowOff,
        sortPos: fromRow + Math.min(0.95, fromRowOff / 600000),
        imageSrc,
      });
    }

    // Sort anchors top-to-bottom
    anchors.sort((a, b) => a.sortPos - b.sortPos);

    for (const anc of anchors) {
      if (!result.sheetRowImages[sheetIdx][anc.fromRow]) {
        result.sheetRowImages[sheetIdx][anc.fromRow] = anc.imageSrc;
      } else if (anc.toRow > anc.fromRow && !result.sheetRowImages[sheetIdx][anc.toRow]) {
        // If two images slightly overlapped at the row border, place the second one on toRow
        result.sheetRowImages[sheetIdx][anc.toRow] = anc.imageSrc;
      } else if (!result.sheetRowImages[sheetIdx][anc.fromRow + 1]) {
        result.sheetRowImages[sheetIdx][anc.fromRow + 1] = anc.imageSrc;
      }

      // Also fill spanned rows if an image covers multiple merged rows and those rows have no image yet
      if (anc.toRow > anc.fromRow && anc.toRow - anc.fromRow <= 4) {
        for (let r = anc.fromRow + 1; r <= anc.toRow; r++) {
          if (!result.sheetRowImages[sheetIdx][r]) {
            result.sheetRowImages[sheetIdx][r] = anc.imageSrc;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Extracts URL from Excel formulas like =IMAGE("https://...") or =HYPERLINK("https://...", "Фото")
 */
function extractUrlFromFormula(formula?: string): string {
  if (!formula) return '';
  const urlMatch = formula.match(/https?:\/\/[^\s"'<>)]+/i);
  if (urlMatch) return urlMatch[0];
  return '';
}

/**
 * Parses a price cell from Russian/English Excel formats:
 * e.g. "1 500 ₽", "1500,00", "от 2500 руб.", "2500/час" -> 1500 or 2500
 */
export function parseExcelPrice(raw: any): number {
  if (typeof raw === 'number' && !isNaN(raw)) {
    return Math.round(raw);
  }
  if (raw === null || raw === undefined) return NaN;

  let str = String(raw).trim();
  if (!str) return NaN;

  // Remove currency suffixes and words like "от", "руб", "р.", "₽", "за чел"
  // Handle decimal comma like "1500,00" or "2 500,50"
  str = str.replace(/(\d)[,\s](\d{2})(?!\d)/g, '$1.$2');
  // Remove spaces used as thousand separators (e.g. "1 500" or "12 000")
  str = str.replace(/(\d)\s+(?=\d{3}\b)/g, '$1');

  // Match the first meaningful number
  const numMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return NaN;

  const val = parseFloat(numMatch[1]);
  return isNaN(val) ? NaN : Math.round(val);
}

/**
 * Checks whether a cell string looks like an image URL or embedded image data URL.
 */
export function looksLikeImageSource(val?: string): boolean {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim();
  if (!s) return false;
  if (s.startsWith('data:image/') || s.startsWith('/assets/')) return true;
  if (
    /\.(jpe?g|png|webp|gif|bmp|svg|avif)(\?|#|$)/i.test(s) ||
    /drive\.google\.com|lh3\.googleusercontent\.com|disk\.yandex\.|yadi\.sk|avatars\.mds\.yandex\.net|userapi\.com|vkuserphoto|postimg\.cc|ibb\.co|imgur\.com|cloud\.mail\.ru|dropbox\.com|unsplash\.com|tildacdn\.com|ozon\.ru|wb\.ru/i.test(
      s
    )
  ) {
    return true;
  }
  if (/^https?:\/\//i.test(s) && !/vk\.com\/(clip|video)|youtube\.com|youtu\.be|rutube\.ru/i.test(s)) {
    return true;
  }
  return false;
}

/**
 * Full parser for .xlsx / .xls / .csv files that extracts both tabular data, hyperlinks,
 * merged cells, AND embedded binary images inside .xlsx files.
 */
export async function parseExcelFileWithImages(
  file: File
): Promise<ParsedExcelWorkbookResult> {
  const buffer = await file.arrayBuffer();

  // 1. Extract embedded binary images if it's an .xlsx ZIP archive
  const media = await extractEmbeddedImagesFromXlsx(buffer);

  // 2. Read workbook via SheetJS
  const wb = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,
    cellNF: true,
    cellText: true,
  });

  const sheets: ParsedExcelSheetData[] = [];
  const usedMediaSet = new Set<string>();

  for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
    const sheetName = wb.SheetNames[sIdx];
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;

    const range = XLSX.utils.decode_range(ws['!ref']);
    const totalRows = range.e.r - range.s.r + 1;
    const totalCols = range.e.c - range.s.c + 1;
    if (totalRows <= 0 || totalCols <= 0) continue;

    const rowImages: Record<number, string> = {
      ...(media.sheetRowImages[sIdx] || {}),
    };
    const cellHyperlinks: Record<string, string> = {};

    // Build 2D grid of cell values, resolving formulas, DISPIMG, RichData vm, and hyperlinks
    const grid: any[][] = [];
    for (let r = 0; r <= range.e.r; r++) {
      const rowArr: any[] = [];
      for (let c = 0; c <= range.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellAddress];

        let cellVal: any = '';
        if (cell) {
          cellVal = cell.w !== undefined && cell.w !== '' ? cell.w : cell.v ?? '';

          // Check Excel 365 RichData image mapped to this cell
          const richImg = media.sheetCellRichImages[sIdx]?.[cellAddress];
          if (richImg) {
            cellVal = richImg;
            if (!rowImages[r]) rowImages[r] = richImg;
            usedMediaSet.add(richImg);
          }

          // Check DISPIMG("ID_...", 1) in formula or text
          const formulaAndVal = `${cell.f || ''} ${String(cellVal)}`;
          const dispMatch = formulaAndVal.match(/DISPIMG\(\s*["']([^"']+)["']/i);
          if (dispMatch && media.dispImgMap[dispMatch[1]]) {
            const dispImg = media.dispImgMap[dispMatch[1]];
            cellVal = dispImg;
            if (!rowImages[r]) rowImages[r] = dispImg;
            usedMediaSet.add(dispImg);
          }

          // Check Hyperlink target on cell
          const linkTarget = cell.l?.Target ? String(cell.l.Target).trim() : '';
          if (linkTarget) {
            cellHyperlinks[`${r}:${c}`] = linkTarget;
            const currentText = String(cellVal ?? '').trim();
            const isShortLabel = currentText.length < 25 && !/\s.*\s/.test(currentText);
            if (looksLikeImageSource(linkTarget) && isShortLabel) {
              if (!looksLikeImageSource(currentText)) {
                cellVal = linkTarget;
              }
              if (!rowImages[r]) rowImages[r] = linkTarget;
            } else if (/^https?:\/\//i.test(linkTarget) && currentText && !currentText.includes(linkTarget)) {
              cellVal = `${currentText}\n${linkTarget}`;
            }
          }

          // Check =IMAGE("...") or =HYPERLINK("...") formula
          if (cell.f) {
            const formulaUrl = extractUrlFromFormula(cell.f);
            if (formulaUrl) {
              const currentText = String(cellVal ?? '').trim();
              const isShortLabel = currentText.length < 25 && !/\s.*\s/.test(currentText);
              if (/^IMAGE\(/i.test(cell.f.trim()) || (looksLikeImageSource(formulaUrl) && isShortLabel)) {
                if (!looksLikeImageSource(currentText)) {
                  cellVal = formulaUrl;
                }
                if (!rowImages[r]) rowImages[r] = formulaUrl;
              } else if (currentText && !currentText.includes(formulaUrl)) {
                cellVal = `${currentText}\n${formulaUrl}`;
              }
            }
          }
        }
        rowArr.push(cellVal);
      }
      grid.push(rowArr);
    }

    // Track used row images
    Object.values(rowImages).forEach((img) => usedMediaSet.add(img));

    // Expand merged cells (!merges) so multi-row categories or photos propagate to all rows in the merge
    const merges = ws['!merges'] || [];
    for (const m of merges) {
      const topVal = grid[m.s.r]?.[m.s.c];
      const topImg = rowImages[m.s.r];
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (r === m.s.r && c === m.s.c) continue;
          // Propagate merged category or merged photo column values
          if (grid[r] && (grid[r][c] === '' || grid[r][c] === undefined) && topVal !== '') {
            // Do not duplicate the service Name or Price across merged rows if only 1 column is merged,
            // Actually in Excel, merging a Category or Photo cell across rows means those rows share that Category or Photo!
            const colSpan = m.e.c - m.s.c + 1;
            const rowSpan = m.e.r - m.s.r + 1;
            if (rowSpan > 1 && colSpan === 1) {
              grid[r][c] = topVal;
            }
          }
        }
        if (topImg && !rowImages[r] && m.e.r - m.s.r <= 6) {
          rowImages[r] = topImg;
        }
      }
    }

    // Find the best header row among the first 15 rows
    let headerRowIndex = 0;
    let bestScore = -1;
    const maxScanRow = Math.min(grid.length - 1, 15);

    for (let r = 0; r <= maxScanRow; r++) {
      const row = grid[r] || [];
      let score = 0;
      for (const cell of row) {
        const text = String(cell || '').trim();
        if (!text || text.startsWith('data:image/')) continue;
        if (/назван|наименов|услуг|товар|программ|пакет|квест|title|name/i.test(text)) score += 4;
        if (/цен|стоим|прайс|руб|price|cost|тариф/i.test(text)) score += 4;
        if (/категор|раздел|групп|тип|category/i.test(text)) score += 2;
        if (/описан|информ|состав|коммент|description/i.test(text)) score += 2;
        if (/фото|картинк|изображ|обложк|ссылк|photo|image|img|pic/i.test(text)) score += 3;
        if (/длительн|время|продолж|мин|час/i.test(text)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        headerRowIndex = r;
      }
    }

    // Check if the file has no header row at all (bestScore === 0 and row 0 already has data)
    let rawHeaders: string[] = [];
    let dataStartRow = headerRowIndex + 1;

    if (bestScore <= 1 && grid.length > 0) {
      // Check if row 0 looks like a service row (has a price number)
      const row0HasPrice = (grid[0] || []).some((val) => {
        const p = parseExcelPrice(val);
        return !isNaN(p) && p >= 50 && p <= 500000;
      });
      if (row0HasPrice) {
        headerRowIndex = -1;
        dataStartRow = 0;
      }
    }

    const colCount = Math.max(...grid.map((r) => r.length), 1);

    // Check if there are embedded images on rows, and add a virtual "[Встроенное фото Excel]" column if needed
    const hasEmbeddedRowImages = Object.keys(rowImages).length > 0;

    if (headerRowIndex >= 0) {
      rawHeaders = Array.from({ length: colCount }, (_, c) => {
        const val = String(grid[headerRowIndex]?.[c] ?? '').trim();
        if (val.startsWith('data:image/')) return `Фото (колонка ${c + 1})`;
        return val || `Колонка ${c + 1}`;
      });
    } else {
      rawHeaders = Array.from({ length: colCount }, (_, c) => `Колонка ${c + 1}`);
    }

    // Deduplicate identical header names so indexOf works cleanly
    const seenHeaders = new Map<string, number>();
    const uniqueHeaders = rawHeaders.map((h) => {
      const count = seenHeaders.get(h) || 0;
      seenHeaders.set(h, count + 1);
      return count === 0 ? h : `${h} (${count + 1})`;
    });

    // Slice rows starting from headerRowIndex (with uniqueHeaders at index 0)
    const normalizedRows: any[][] = [uniqueHeaders];
    const normalizedRowImages: Record<number, string> = {};

    for (let r = dataStartRow; r < grid.length; r++) {
      const row = grid[r];
      const hasAnyValue =
        row.some((cell) => String(cell ?? '').trim() !== '') || Boolean(rowImages[r]);
      if (!hasAnyValue) continue;

      const targetRowIdx = normalizedRows.length;
      normalizedRows.push(row);
      if (rowImages[r]) {
        normalizedRowImages[targetRowIdx] = rowImages[r];
      } else {
        // Also scan all cells in this row to see if any cell holds an image URL or data:image
        for (let c = 0; c < row.length; c++) {
          const cellStr = String(row[c] ?? '').trim();
          if (looksLikeImageSource(cellStr)) {
            normalizedRowImages[targetRowIdx] = cellStr;
            break;
          }
        }
      }
    }

    // Auto-detect column mapping using both header names AND column content analysis
    const findHeaderByRegex = (regex: RegExp) =>
      uniqueHeaders.find((h) => regex.test(h)) || '';

    let categoryCol = findHeaderByRegex(/категор|раздел|групп|тип|category/i);
    let nameCol = findHeaderByRegex(/назван|наименов|услуг|товар|программ|пакет|квест|имя|заголов|title|name/i);
    let descCol = findHeaderByRegex(/описан|информ|состав|коммент|детал|description/i);
    let priceCol = findHeaderByRegex(/^(?!.*стар).*?(цен|стоим|прайс|руб|price|cost|тариф)/i);
    let oldPriceCol = findHeaderByRegex(/скидк|стар|было|old/i);
    let durationCol = findHeaderByRegex(/длительн|время|продолж|duration/i);
    let imageCol = findHeaderByRegex(/фото|картинк|изображ|обложк|photo|image|img|pic|ссылк|url/i);

    // Content-based fallback detection if headers were non-standard
    const sampleRows = normalizedRows.slice(1, 25);
    if (!priceCol && sampleRows.length > 0) {
      let bestPriceColIdx = -1;
      let bestPriceHits = 0;
      for (let c = 0; c < uniqueHeaders.length; c++) {
        let hits = 0;
        for (const r of sampleRows) {
          const val = r[c];
          if (typeof val === 'string' && val.startsWith('data:image/')) continue;
          const p = parseExcelPrice(val);
          if (!isNaN(p) && p >= 50 && p <= 500000) hits++;
        }
        if (hits > bestPriceHits) {
          bestPriceHits = hits;
          bestPriceColIdx = c;
        }
      }
      if (bestPriceColIdx !== -1) {
        priceCol = uniqueHeaders[bestPriceColIdx];
      }
    }

    if (!imageCol && sampleRows.length > 0) {
      for (let c = 0; c < uniqueHeaders.length; c++) {
        const hasImgInCol = sampleRows.some((r) => looksLikeImageSource(String(r[c] ?? '')));
        if (hasImgInCol) {
          imageCol = uniqueHeaders[c];
          break;
        }
      }
    }

    if (!nameCol && sampleRows.length > 0) {
      for (let c = 0; c < uniqueHeaders.length; c++) {
        const h = uniqueHeaders[c];
        if (h === priceCol || h === imageCol || h === categoryCol) continue;
        const hasText = sampleRows.some((r) => {
          const s = String(r[c] ?? '').trim();
          return s.length >= 3 && !s.startsWith('data:image/') && isNaN(Number(s));
        });
        if (hasText) {
          nameCol = h;
          break;
        }
      }
    }

    if (!descCol && sampleRows.length > 0) {
      for (let c = 0; c < uniqueHeaders.length; c++) {
        const h = uniqueHeaders[c];
        if (h === nameCol || h === priceCol || h === imageCol || h === categoryCol) continue;
        const avgLen =
          sampleRows.reduce((acc, r) => {
            const s = String(r[c] ?? '').trim();
            return acc + (s.startsWith('data:image/') ? 0 : s.length);
          }, 0) / sampleRows.length;
        if (avgLen > 18) {
          descCol = h;
          break;
        }
      }
    }

    if (hasEmbeddedRowImages && !imageCol) {
      const embeddedHeader = 'Встроенное фото Excel';
      uniqueHeaders.push(embeddedHeader);
      imageCol = embeddedHeader;
    }

    if (normalizedRows.length > 1) {
      sheets.push({
        sheetName,
        headers: uniqueHeaders,
        headerRowIndex,
        rows: normalizedRows,
        rowImages: normalizedRowImages,
        cellHyperlinks,
        suggestedMapping: {
          category: categoryCol,
          name: nameCol,
          description: descCol,
          price: priceCol,
          oldPrice: oldPriceCol,
          duration: durationCol,
          image: imageCol,
        },
      });
    }
  }

  const unassignedMediaQueue = media.allMediaList.filter((m) => !usedMediaSet.has(m));

  return {
    sheets,
    embeddedImagesCount: media.allMediaList.length,
    unassignedMediaQueue,
  };
}

/**
 * Builds structured Service previews from a parsed sheet and current column mapping,
 * resolving all embedded images, cell URLs, Yandex Disk links, and section subheaders.
 */
export function buildServicesPreviewFromSheet(
  sheet: ParsedExcelSheetData,
  mapping: {
    category: string;
    name: string;
    description: string;
    price: string;
    oldPrice?: string;
    duration?: string;
    image: string;
  },
  unassignedMediaQueue: string[] = []
): ParsedExcelRowPreview[] {
  const headers = sheet.headers;
  const catIdx = headers.indexOf(mapping.category);
  const nameIdx = headers.indexOf(mapping.name);
  const descIdx = headers.indexOf(mapping.description);
  const priceIdx = headers.indexOf(mapping.price);
  const oldPriceIdx = mapping.oldPrice ? headers.indexOf(mapping.oldPrice) : -1;
  const durationIdx = mapping.duration ? headers.indexOf(mapping.duration) : -1;
  const imgIdx = headers.indexOf(mapping.image);

  if (nameIdx === -1) return [];

  const previews: ParsedExcelRowPreview[] = [];
  let currentSubheaderCategory = 'Основное';
  let unassignedPtr = 0;

  for (let i = 1; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    if (!row || row.length === 0) continue;

    // Check if this row is a category section divider (e.g. a single bold title cell with no price)
    const nonEmptyCells = row
      .map((val, cIdx) => ({ val: String(val ?? '').trim(), cIdx }))
      .filter((item) => item.val !== '' && !item.val.startsWith('data:image/'));

    const rawName = String(row[nameIdx] ?? '').trim();
    const rawPriceCell = priceIdx !== -1 ? row[priceIdx] : '';
    let priceVal = parseExcelPrice(rawPriceCell);

    // If price wasn't found in priceIdx, check if price is embedded in the name or another cell
    if (isNaN(priceVal)) {
      if (nonEmptyCells.length === 1 && nonEmptyCells[0].val.length < 55) {
        // It's a section header row like "ШОУ-ПРОГРАММЫ" or "ДОПОЛНИТЕЛЬНЫЕ УСЛУГИ"
        currentSubheaderCategory = nonEmptyCells[0].val;
        continue;
      }
      // Try extracting price from description or name if price column was blank on this row
      const fallbackPriceFromName = parseExcelPrice(rawName);
      if (!isNaN(fallbackPriceFromName) && fallbackPriceFromName >= 100) {
        priceVal = fallbackPriceFromName;
      }
    }

    if (!rawName || rawName.startsWith('data:image/')) continue;
    // Skip repeated header rows inside the table
    if (/^(название|наименование|услуга|товар)$/i.test(rawName)) continue;

    if (isNaN(priceVal)) {
      // If a row has a valid service name and description/photo, allow price = 0 ("По запросу") instead of dropping the service
      const hasDescOrImg =
        (descIdx !== -1 && String(row[descIdx] ?? '').trim().length > 3) ||
        Boolean(sheet.rowImages[i]);
      if (hasDescOrImg) {
        priceVal = 0;
      } else {
        continue;
      }
    }

    const explicitCat =
      catIdx !== -1 && row[catIdx] && !String(row[catIdx]).startsWith('data:image/')
        ? String(row[catIdx]).trim()
        : '';
    const category = explicitCat || currentSubheaderCategory || sheet.sheetName || 'Основное';

    const description =
      descIdx !== -1 && row[descIdx] && !String(row[descIdx]).startsWith('data:image/')
        ? String(row[descIdx]).trim()
        : 'Подробности уточняйте у организатора праздника.';

    const oldPriceVal =
      oldPriceIdx !== -1 && row[oldPriceIdx] ? parseExcelPrice(row[oldPriceIdx]) : undefined;

    const duration =
      durationIdx !== -1 && row[durationIdx] ? String(row[durationIdx]).trim() : undefined;

    // Resolve image for this row from all possible sources:
    // 1. Mapped image column cell
    // 2. Embedded Excel drawing / DISPIMG / RichData image on row i
    // 3. Any other cell in row i that looks like an image source
    // 4. Unassigned media from xl/media/* if available
    let candidateImage = '';

    if (imgIdx !== -1 && row[imgIdx]) {
      const val = String(row[imgIdx]).trim();
      if (looksLikeImageSource(val)) {
        candidateImage = val;
      }
    }

    if (!candidateImage && sheet.rowImages[i]) {
      candidateImage = sheet.rowImages[i];
    }

    if (!candidateImage) {
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] ?? '').trim();
        if (looksLikeImageSource(val)) {
          candidateImage = val;
          break;
        }
      }
    }

    if (!candidateImage && unassignedPtr < unassignedMediaQueue.length) {
      candidateImage = unassignedMediaQueue[unassignedPtr++];
    }

    const normalizedImg = normalizeImageUrl(candidateImage);

    previews.push({
      rowIndex: i,
      sheetName: sheet.sheetName,
      category,
      name: rawName,
      description,
      price: priceVal,
      ...(oldPriceVal && !isNaN(oldPriceVal) && oldPriceVal > priceVal
        ? { oldPrice: oldPriceVal }
        : {}),
      ...(duration ? { duration } : {}),
      rawImage: normalizedImg,
      hasCustomPhoto: Boolean(normalizedImg),
    });
  }

  return previews;
}

/**
 * Converts ParsedExcelRowPreview items into final Service objects, resolving any async
 * cloud links (such as Yandex Disk public links) so all photos work on the site.
 */
export async function finalizeImportedServices(
  previews: ParsedExcelRowPreview[]
): Promise<Service[]> {
  const results: Service[] = [];
  const baseTs = Date.now();

  for (let i = 0; i < previews.length; i++) {
    const item = previews[i];
    let finalImg = item.rawImage;

    // If the link is a Yandex Disk public link (disk.yandex.ru or yadi.sk), resolve direct image URL
    if (finalImg && /disk\.yandex\.|yadi\.sk/i.test(finalImg)) {
      const resolvedYandex = await resolveYandexDiskImageUrl(finalImg);
      if (resolvedYandex) {
        finalImg = resolvedYandex;
      }
    }

    const draftSrv: Partial<Service> = {
      category: item.category,
      name: item.name,
      description: item.description,
      image: finalImg,
    };

    results.push({
      id: `srv-excel-${baseTs}-${i}`,
      category: item.category,
      name: item.name,
      description: item.description,
      price: item.price,
      ...(item.oldPrice ? { oldPrice: item.oldPrice } : {}),
      ...(item.duration ? { duration: item.duration } : {}),
      image: resolveServiceImage(draftSrv, i),
      availability: 'Доступно',
      isPopular: false,
    });
  }

  return results;
}
