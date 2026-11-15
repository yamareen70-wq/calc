import { getFontEmbedCSS, toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

let cachedFontEmbedCssPromise: Promise<string> | null = null;

async function getCachedFontEmbedCss(sampleEl: HTMLElement): Promise<string | undefined> {
  if (!cachedFontEmbedCssPromise) {
    cachedFontEmbedCssPromise = getFontEmbedCSS(sampleEl, { cacheBust: false }).catch(() => '');
  }
  const css = await cachedFontEmbedCssPromise;
  return css.length > 0 ? css : undefined;
}

/**
 * Renders discrete `[data-pdf-block="true"]` children inside `containerEl`
 * onto paginated A4 pages without cutting equations or steps mid-block,
 * and triggers an immediate PDF download.
 */
export async function generatePdfFromContainer(
  containerEl: HTMLElement,
  filename: string
): Promise<void> {
  const blocks = Array.from(
    containerEl.querySelectorAll<HTMLElement>('[data-pdf-block="true"]')
  );
  if (blocks.length === 0) {
    throw new Error('No printable blocks found');
  }

  // Wait for webfonts (KaTeX + Arabic/Mono) to settle before rasterizing
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const fontEmbedCSS = await getCachedFontEmbedCss(blocks[0]);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidthMm = pdf.internal.pageSize.getWidth();
  const pageHeightMm = pdf.internal.pageSize.getHeight();
  const marginX = 10;
  const marginTop = 10;
  const marginBottom = 14;
  const contentWidthMm = pageWidthMm - marginX * 2;
  const maxContentHeightMm = pageHeightMm - marginTop - marginBottom;

  let cursorYMm = marginTop;

  const captureBlockCanvas = async (el: HTMLElement): Promise<HTMLCanvasElement> => {
    try {
      return await toCanvas(el, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: false,
        ...(fontEmbedCSS !== undefined ? { fontEmbedCSS } : { skipFonts: true }),
      });
    } catch {
      // Fallback if external font stylesheet throws a CORS security error
      return await toCanvas(el, {
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        skipFonts: true,
      });
    }
  };

  for (const block of blocks) {
    const canvas = await captureBlockCanvas(block);
    if (canvas.width === 0 || canvas.height === 0) continue;

    const fullImgHeightMm = (canvas.height / canvas.width) * contentWidthMm;

    if (fullImgHeightMm <= maxContentHeightMm) {
      if (cursorYMm > marginTop && cursorYMm + fullImgHeightMm > marginTop + maxContentHeightMm) {
        pdf.addPage();
        cursorYMm = marginTop;
      }
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', marginX, cursorYMm, contentWidthMm, fullImgHeightMm, undefined, 'FAST');
      cursorYMm += fullImgHeightMm;
    } else {
      // Oversized single block fallback: slice cleanly across page heights
      if (cursorYMm > marginTop) {
        pdf.addPage();
        cursorYMm = marginTop;
      }
      const pxPerMm = canvas.width / contentWidthMm;
      const sliceMaxPx = Math.floor(maxContentHeightMm * pxPerMm);
      let srcY = 0;

      while (srcY < canvas.height) {
        const sliceH = Math.min(sliceMaxPx, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const sCtx = sliceCanvas.getContext('2d');
        if (sCtx) {
          sCtx.fillStyle = '#ffffff';
          sCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sCtx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceImg = sliceCanvas.toDataURL('image/png');
          const sliceMm = sliceH / pxPerMm;
          pdf.addImage(sliceImg, 'PNG', marginX, cursorYMm, contentWidthMm, sliceMm, undefined, 'FAST');
          cursorYMm += sliceMm;
        }
        srcY += sliceH;
        if (srcY < canvas.height) {
          pdf.addPage();
          cursorYMm = marginTop;
        }
      }
    }
  }

  // Add subtle numeric page footer (e.g., "1 / 2") to every page
  const totalPages = pdf.getNumberOfPages();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.text(`${p} / ${totalPages}`, pageWidthMm / 2, pageHeightMm - 6, { align: 'center' });
  }

  pdf.save(filename);
}
