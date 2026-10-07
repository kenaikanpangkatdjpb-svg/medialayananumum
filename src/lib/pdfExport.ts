import jsPDF from 'jspdf';
import { toCanvas, toJpeg } from 'html-to-image';

export interface ExportPdfOptions {
  filename: string;
  elementId: string;
  orientation?: 'portrait' | 'landscape';
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (err: Error) => void;
}

export interface GeneratedPdfResult {
  blob: Blob;
  blobUrl: string;
  pdf: jsPDF;
}

export interface CreatePdfOptions {
  orientation?: 'portrait' | 'landscape';
}

/**
 * Creates a jsPDF document and Blob from a DOM element.
 * Useful for previewing PDF before printing or downloading.
 */
export async function createPdfFromElement(
  elementId: string,
  options?: CreatePdfOptions
): Promise<GeneratedPdfResult | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found`);
    return null;
  }

  let imgData: string;
  let canvasWidth = element.offsetWidth || element.scrollWidth || 794;
  let canvasHeight = element.offsetHeight || element.scrollHeight || 1123;

  try {
    const canvas = await toCanvas(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      skipFonts: true,
      filter: (domNode) => {
        if (domNode instanceof HTMLElement) {
          if (domNode.classList.contains('no-print') || domNode.classList.contains('print:hidden')) {
            return false;
          }
        }
        return true;
      },
    });
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    imgData = canvas.toDataURL('image/jpeg', 0.98);
  } catch (canvasErr) {
    console.warn('toCanvas failed, falling back to toJpeg:', canvasErr);
    imgData = await toJpeg(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 1.5,
      skipFonts: true,
    });
  }

  const orientation = options?.orientation || (canvasWidth > canvasHeight ? 'landscape' : 'portrait');

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Fit canvas aspect ratio to page width
  const imgWidth = pdfWidth;
  const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Subsequent pages if document exceeds single A4 page
  while (heightLeft > 2) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const blob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { blob, blobUrl, pdf };
}

/**
 * Generates a clean A4 PDF from a DOM element using html-to-image and jsPDF.
 * Fully supports modern CSS (oklch colors in Tailwind v4, flexbox, CSS variables, etc.)
 * and works reliably inside sandboxed iframes.
 */
export async function exportElementToPdf({
  filename,
  elementId,
  orientation,
  onStart,
  onSuccess,
  onError,
}: ExportPdfOptions): Promise<boolean> {
  onStart?.();

  try {
    const result = await createPdfFromElement(elementId, { orientation });
    if (!result) {
      const err = new Error(`Elemen dokumen dengan ID #${elementId} tidak ditemukan.`);
      onError?.(err);
      return false;
    }

    const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    result.pdf.save(safeFilename);
    onSuccess?.();
    return true;
  } catch (err) {
    console.error('Gagal membuat PDF:', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return false;
  }
}

/**
 * Triggers native browser print dialog with fallback
 */
export function triggerPrint(): boolean {
  try {
    window.print();
    return true;
  } catch (err) {
    console.warn('Browser print dialog is blocked or failed:', err);
    return false;
  }
}

export interface PrintDocumentOptions {
  orientation?: 'portrait' | 'landscape';
}

/**
 * Prints a DOM element cleanly.
 * Strategy:
 * 1. Attempts to open a dedicated print window (escapes sandboxed iframes and allows native print dialog).
 * 2. If popup is blocked by the browser, falls back directly to window.print().
 */
export function printDocumentElement(
  elementId: string,
  docTitle = 'Dokumen Resmi',
  options?: PrintDocumentOptions
): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Elemen dengan ID #${elementId} tidak ditemukan untuk dicetak.`);
    try {
      window.focus();
      window.print();
      return true;
    } catch {
      return false;
    }
  }

  const orientation = options?.orientation || 'portrait';
  const containerMaxWidth = orientation === 'landscape' ? '297mm' : '210mm';

  // Collect all link and style elements to retain Tailwind CSS and fonts
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  // Try opening a dedicated clean popup print window first
  try {
    const printWin = window.open('', '_blank', 'width=950,height=850,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>${docTitle}</title>
            ${styles}
            <style>
              @page {
                size: A4 ${orientation};
                margin: 8mm 10mm;
              }
              *, *::before, *::after {
                box-sizing: border-box;
              }
              body {
                background: #f8fafc;
                color: #0f172a;
                margin: 0;
                padding: 16px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              }
              .no-print-toolbar {
                position: sticky;
                top: 0;
                z-index: 9999;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                background: #083c74;
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 10px;
                margin-bottom: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              }
              .toolbar-title {
                font-size: 14px;
                font-weight: 700;
              }
              .toolbar-actions {
                display: flex;
                align-items: center;
                gap: 8px;
              }
              .btn-print {
                background: #38bdf8;
                color: #082f49;
                font-size: 13px;
                font-weight: 800;
                border: none;
                padding: 8px 18px;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                transition: background 0.15s;
              }
              .btn-print:hover {
                background: #7dd3fc;
              }
              .btn-close {
                background: rgba(255,255,255,0.15);
                color: #ffffff;
                font-size: 13px;
                font-weight: 600;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
              }
              .btn-close:hover {
                background: rgba(255,255,255,0.25);
              }
              .print-container {
                background: #ffffff;
                max-width: ${containerMaxWidth};
                margin: 0 auto;
                padding: 0;
                box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                border: 1px solid #e2e8f0;
              }
              @media print {
                body {
                  background: #ffffff !important;
                  padding: 0 !important;
                }
                .no-print-toolbar, .no-print, .print\\:hidden {
                  display: none !important;
                }
                .print-container {
                  box-shadow: none !important;
                  border: none !important;
                  max-width: 100% !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                #${elementId} {
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  transform: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="no-print-toolbar">
              <div class="toolbar-title">
                🖨️ Siap Cetak: ${docTitle}
              </div>
              <div class="toolbar-actions">
                <button type="button" class="btn-print" onclick="window.focus(); window.print();">
                  Cetak Dokumen Sekarang
                </button>
                <button type="button" class="btn-close" onclick="window.close()">
                  Tutup
                </button>
              </div>
            </div>
            <div class="print-container">
              ${element.outerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  try {
                    window.focus();
                    window.print();
                  } catch (e) {
                    console.warn('Auto-print error:', e);
                  }
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
      return true;
    }
  } catch (err) {
    console.warn('Popup print window was blocked or failed:', err);
  }

  // Fallback: direct window.print() on the current window
  try {
    window.focus();
    window.print();
    return true;
  } catch (err) {
    console.warn('Direct window.print() also failed:', err);
    return false;
  }
}
