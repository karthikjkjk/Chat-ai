import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser.js';
import { Attachment } from '../types.ts';

// Point PDF.js to the local Vite-bundled worker so PDF extraction works offline & reliably
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const MAX_EXTRACTED_TEXT_CHARS = 60_000;

export const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'log',
  'xml',
  'yaml',
  'yml',
  'html',
  'htm',
  'css',
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'php',
  'rb',
  'sh',
  'sql',
  'env',
  'ini',
]);

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() || '' : '';
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

async function extractPdfTextWithPdfJs(file: File): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);
    const joined = strings.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) {
      pageTexts.push(`--- Page ${pageNum} ---\n${joined}`);
    }
  }

  return {
    text: pageTexts.join('\n\n').trim(),
    pageCount,
  };
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return (result?.value || '').trim();
}

function stripRtfBasic(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\{\*?\\[^}]+\}/g, '')
    .replace(/\\[a-z]+\d*\s?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractDocBestEffort(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  // Detect OLE2 binary .doc signature (D0 CF 11 E0 A1 B1 1A E1)
  const isOle2 =
    buf.length >= 4 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0;

  if (isOle2) {
    throw new Error(
      `Legacy binary .doc ("${file.name}") cannot be decoded safely in the browser. Please save/export it as .docx, .pdf, or .txt so CHAT AI can read every word accurately.`
    );
  }

  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  if (decoded.trimStart().startsWith('{\\rtf')) {
    const clean = stripRtfBasic(decoded);
    if (clean.length > 0) return clean;
  }

  // Some tools save XML or plain text with a .doc extension
  if (!decoded.includes('\u0000') && decoded.trim().length > 0) {
    return decoded.trim();
  }

  throw new Error(
    `Could not extract readable text from "${file.name}". Please convert it to .docx, .pdf, or .txt.`
  );
}

export interface ProcessFilesResult {
  attachments: Attachment[];
  errors: string[];
}

export async function processSelectedFiles(
  fileList: FileList | File[],
  sourceCategory: 'photos' | 'camera' | 'documents' | 'files',
  existingCount: number
): Promise<ProcessFilesResult> {
  const files = Array.from(fileList);
  const attachments: Attachment[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (existingCount + attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      errors.push(
        `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message reached. "${file.name}" was skipped.`
      );
      continue;
    }

    const ext = getExtension(file.name);
    const mime = (file.type || '').toLowerCase();
    const isImage =
      mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'].includes(ext);

    // 1. IMAGE HANDLING (Photos / Camera)
    if (isImage) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        errors.push(
          `"${file.name}" (${formatFileSize(file.size)}) exceeds the ${formatFileSize(
            MAX_IMAGE_SIZE_BYTES
          )} image limit.`
        );
        continue;
      }

      const normalizedMime =
        mime && mime !== 'image/jpg'
          ? mime
          : ext === 'png'
          ? 'image/png'
          : ext === 'webp'
          ? 'image/webp'
          : ext === 'gif'
          ? 'image/gif'
          : 'image/jpeg';

      if (!SUPPORTED_IMAGE_MIME_TYPES.has(normalizedMime)) {
        errors.push(
          `Image format "${ext || mime || 'unknown'}" for "${file.name}" is not supported by Gemini Vision. Supported image formats: JPG, PNG, WEBP, GIF.`
        );
        continue;
      }

      try {
        const dataUrl = await readAsDataURL(file);
        attachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || `photo-${Date.now()}.jpg`,
          size: file.size,
          type: normalizedMime,
          mimeType: normalizedMime,
          data: dataUrl,
          kind: 'image',
          sourceCategory,
        });
      } catch (err: any) {
        errors.push(err?.message || `Failed to load image "${file.name}".`);
      }
      continue;
    }

    // Check document/file size limit (10 MB)
    if (file.size > MAX_DOC_SIZE_BYTES) {
      errors.push(
        `"${file.name}" (${formatFileSize(file.size)}) exceeds the ${formatFileSize(
          MAX_DOC_SIZE_BYTES
        )} document size limit.`
      );
      continue;
    }

    // 2. PDF EXTRACTION (via PDF.js)
    if (mime === 'application/pdf' || ext === 'pdf') {
      try {
        const { text, pageCount } = await extractPdfTextWithPdfJs(file);
        if (!text) {
          errors.push(
            `No selectable text found in "${file.name}" (${pageCount} page${
              pageCount === 1 ? '' : 's'
            }). If this is a scanned/image-only PDF, attach a screenshot or photo of the page instead.`
          );
          continue;
        }
        const truncated = text.length > MAX_EXTRACTED_TEXT_CHARS;
        const cleanText = truncated
          ? `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Truncated after ${MAX_EXTRACTED_TEXT_CHARS.toLocaleString()} characters]`
          : text;

        attachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: 'application/pdf',
          mimeType: 'application/pdf',
          data: '',
          kind: 'pdf',
          extractedText: cleanText,
          pageCount,
          truncated,
          sourceCategory,
        });
      } catch (err: any) {
        errors.push(
          `Could not parse PDF "${file.name}": ${
            err?.message || 'The file may be encrypted, password-protected, or corrupted.'
          }`
        );
      }
      continue;
    }

    // 3. DOCX EXTRACTION (via Mammoth)
    if (
      ext === 'docx' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const rawText = await extractDocxText(file);
        if (!rawText) {
          errors.push(
            `No readable text found inside DOCX "${file.name}". Please check the file contents.`
          );
          continue;
        }
        const truncated = rawText.length > MAX_EXTRACTED_TEXT_CHARS;
        const cleanText = truncated
          ? `${rawText.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Truncated after ${MAX_EXTRACTED_TEXT_CHARS.toLocaleString()} characters]`
          : rawText;

        attachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          data: '',
          kind: 'docx',
          extractedText: cleanText,
          truncated,
          sourceCategory,
        });
      } catch (err: any) {
        errors.push(
          `Could not extract text from DOCX "${file.name}": ${err?.message || 'Invalid DOCX file.'}`
        );
      }
      continue;
    }

    // 4. LEGACY .DOC HANDLING
    if (ext === 'doc' || mime === 'application/msword') {
      try {
        const text = await extractDocBestEffort(file);
        const truncated = text.length > MAX_EXTRACTED_TEXT_CHARS;
        const cleanText = truncated
          ? `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Truncated after ${MAX_EXTRACTED_TEXT_CHARS.toLocaleString()} characters]`
          : text;

        attachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: 'application/msword',
          mimeType: 'application/msword',
          data: '',
          kind: 'doc',
          extractedText: cleanText,
          truncated,
          sourceCategory,
        });
      } catch (err: any) {
        errors.push(err?.message || `Unsupported legacy .doc file "${file.name}".`);
      }
      continue;
    }

    // 5. TXT / MARKDOWN / CODE / STRUCTURED TEXT
    if (mime.startsWith('text/') || mime === 'application/json' || TEXT_EXTENSIONS.has(ext)) {
      try {
        const rawText = await file.text();
        if (rawText.includes('\u0000')) {
          errors.push(`"${file.name}" appears to contain binary data and cannot be read as text.`);
          continue;
        }
        if (!rawText.trim()) {
          errors.push(`"${file.name}" is empty (0 readable characters).`);
          continue;
        }
        const truncated = rawText.length > MAX_EXTRACTED_TEXT_CHARS;
        const cleanText = truncated
          ? `${rawText.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[Truncated after ${MAX_EXTRACTED_TEXT_CHARS.toLocaleString()} characters]`
          : rawText;

        attachments.push({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          type: mime || 'text/plain',
          mimeType: mime || 'text/plain',
          data: '',
          kind: 'text',
          extractedText: cleanText,
          truncated,
          sourceCategory,
        });
      } catch (err: any) {
        errors.push(`Failed to read text file "${file.name}": ${err?.message || 'Unknown error'}`);
      }
      continue;
    }

    // 6. UNSUPPORTED FORMAT REJECTION (Never pretend an unsupported binary file was read)
    errors.push(
      `Unsupported file format for "${file.name}" (${ext ? `.${ext}` : mime || 'unknown'}). Supported: Images (JPG, PNG, WEBP, GIF up to 8 MB) and Documents (PDF, DOCX, TXT, CSV, JSON, MD, code files up to 10 MB).`
    );
  }

  return { attachments, errors };
}
