import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';

import type { BeaconVulnerabilityMeta } from 'services/Lightwell/BeaconApi';
import { STAGES } from '../constants';
import type { Vulnerability } from '../types';
import {
  createDefaultVulnerabilityColumns,
  getVulnerabilityColumnValue,
  getVisibleVulnerabilityColumns,
} from '../utils/vulnerabilityTableColumns';
import {
  COLUMN_PDF_WIDTH,
  DEFAULT_COLUMN_PDF_WIDTH,
  formatBeaconPdfGeneratedAt,
  shouldUseLandscapePdf,
  type BeaconPdfColumn,
} from './beaconPdf';

const MARGIN = 36;
const TABLE_FONT_SIZE = 8;
const TABLE_LINE_HEIGHT = 10;
const CELL_PAD_X = 4;
const CELL_PAD_Y = 3;
const MAX_WRAP_LINES = 4;
const ARROW_WIDTH = 12;
const STAGE_CARD_HEIGHT = 48;

const WRAP_COLUMNS = new Set(['component', 'title', 'cvssVector', 'batch']);

const COLOR = {
  text: rgb(21 / 255, 21 / 255, 21 / 255),
  muted: rgb(106 / 255, 110 / 255, 115 / 255),
  red: rgb(201 / 255, 25 / 255, 11 / 255),
  blocked: rgb(240 / 255, 171 / 255, 0),
  embargo: rgb(103 / 255, 83 / 255, 172 / 255),
  headerBg: rgb(240 / 255, 240 / 255, 240 / 255),
  evenRow: rgb(250 / 255, 250 / 255, 250 / 255),
  border: rgb(210 / 255, 210 / 255, 210 / 255),
  white: rgb(1, 1, 1),
};

export type GenerateBeaconPdfOptions = {
  customerId: string;
  visibleColumns: BeaconPdfColumn[];
  vulnerabilities: Vulnerability[];
  meta: BeaconVulnerabilityMeta;
  generatedAt?: string;
};

type ColumnLayout = {
  key: string;
  title: string;
  x: number;
  width: number;
  wrap: boolean;
};

type PdfState = {
  page: PDFPage;
  y: number;
};

function toWinAnsi(text: string): string {
  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code === 9 || code === 10 || code === 13) {
        return ' ';
      }
      if (code < 32 || code === 127) {
        return '';
      }
      if (char === '—' || char === '–') {
        return '-';
      }
      if (char === '“' || char === '”' || char === '„') {
        return '"';
      }
      if (char === '‘' || char === '’') {
        return "'";
      }
      if (char === '…') {
        return '...';
      }
      if (char === '•') {
        return '*';
      }
      if (code <= 255) {
        return char;
      }
      return '?';
    })
    .join('');
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines = MAX_WRAP_LINES,
): string[] {
  const safe = toWinAnsi(text);
  if (!safe) {
    return [''];
  }
  if (maxWidth <= 0) {
    return [''];
  }
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) {
    return [safe];
  }

  const lines: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  const splitLongWord = (word: string): string => {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      return word;
    }
    let chunk = '';
    for (const char of word) {
      const next = chunk + char;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) {
          lines.push(chunk);
        }
        chunk = char;
      }
    }
    return chunk;
  };

  for (const word of safe.split(/\s+/)) {
    if (!word) {
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    flush();
    current = splitLongWord(word);
  }
  flush();

  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines);
    truncated[maxLines - 1] = ellipsize(truncated[maxLines - 1], font, size, maxWidth);
    return truncated;
  }

  return lines.length ? lines : [''];
}

function ellipsize(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = toWinAnsi(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) {
    return safe;
  }
  const ellipsis = '...';
  let cut = safe;
  while (cut.length && font.widthOfTextAtSize(cut + ellipsis, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}${ellipsis}`;
}

function layoutColumns(
  columns: BeaconPdfColumn[],
  tableX: number,
  tableWidth: number,
): ColumnLayout[] {
  const weights = columns.map((column) => COLUMN_PDF_WIDTH[column.key] ?? DEFAULT_COLUMN_PDF_WIDTH);
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let x = tableX;
  return columns.map((column, index) => {
    const width = (weights[index] / total) * tableWidth;
    const layout = {
      key: column.key,
      title: column.title,
      x,
      width,
      wrap: WRAP_COLUMNS.has(column.key),
    };
    x += width;
    return layout;
  });
}

function cellLines(value: string, column: ColumnLayout, font: PDFFont): string[] {
  const innerWidth = column.width - CELL_PAD_X * 2;
  if (column.wrap) {
    return wrapText(value, font, TABLE_FONT_SIZE, innerWidth);
  }
  return [ellipsize(value, font, TABLE_FONT_SIZE, innerWidth)];
}

function rowHeight(lineCounts: number): number {
  return lineCounts * TABLE_LINE_HEIGHT + CELL_PAD_Y * 2;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  x: number,
  width: number,
  baselineY: number,
  font: PDFFont,
  size: number,
  color: RGB,
): void {
  const safe = toWinAnsi(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, {
    x: x + Math.max(0, (width - textWidth) / 2),
    y: baselineY,
    size,
    font,
    color,
  });
}

export async function generateBeaconPdf({
  customerId,
  visibleColumns,
  vulnerabilities,
  meta,
  generatedAt = formatBeaconPdfGeneratedAt(),
}: GenerateBeaconPdfOptions): Promise<Uint8Array> {
  const columns = visibleColumns.length
    ? visibleColumns
    : getVisibleVulnerabilityColumns(createDefaultVulnerabilityColumns());
  const landscape = shouldUseLandscapePdf(columns);
  const [pageWidth, pageHeight] = landscape
    ? ([PageSizes.A4[1], PageSizes.A4[0]] as [number, number])
    : PageSizes.A4;
  const contentWidth = pageWidth - MARGIN * 2;
  const tableX = MARGIN;
  const columnLayouts = layoutColumns(columns, tableX, contentWidth);

  const doc = await PDFDocument.create();
  doc.setTitle('Lightwell Vulnerability Report');
  doc.setCreator('Lightwell Beacon');

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const state: PdfState = {
    page: doc.addPage([pageWidth, pageHeight]),
    y: pageHeight - MARGIN,
  };

  const startContinuedPage = () => {
    state.page = doc.addPage([pageWidth, pageHeight]);
    state.y = pageHeight - MARGIN;
    state.page.drawText('Vulnerabilities (continued)', {
      x: MARGIN,
      y: state.y - 12,
      size: 12,
      font: fontBold,
      color: COLOR.text,
    });
    state.y -= 22;
  };

  const fits = (needed: number) => state.y - needed >= MARGIN;

  const drawSummary = () => {
    state.page.drawText('Lightwell Vulnerability Report', {
      x: MARGIN,
      y: state.y - 18,
      size: 18,
      font: fontBold,
      color: COLOR.red,
    });
    state.y -= 32;

    const metaParts = [`Customer ID: ${customerId}`, `Generated: ${generatedAt}`];
    state.page.drawText(metaParts.join(' · '), {
      x: MARGIN,
      y: state.y - 10,
      size: 10,
      font,
      color: COLOR.muted,
    });
    state.y -= 28;

    const stats = [
      { label: 'Total', value: String(meta.count ?? vulnerabilities.length), color: COLOR.text },
      { label: 'Critical', value: String(meta.criticalCount ?? 0), color: COLOR.red },
      { label: 'Blocked', value: String(meta.blockedCount ?? 0), color: COLOR.blocked },
      { label: 'Embargoed', value: String(meta.embargoCount ?? 0), color: COLOR.embargo },
    ];
    const statWidth = Math.min(90, contentWidth / stats.length);
    const statsGroupWidth = statWidth * stats.length;
    const statsX = MARGIN + (contentWidth - statsGroupWidth) / 2;
    stats.forEach((stat, index) => {
      const x = statsX + index * statWidth;
      drawCenteredText(
        state.page,
        stat.value,
        x,
        statWidth,
        state.y - 18,
        fontBold,
        18,
        stat.color,
      );
      drawCenteredText(state.page, stat.label, x, statWidth, state.y - 32, font, 9, COLOR.muted);
    });
    state.y -= 52;

    state.page.drawText('By Stage', {
      x: MARGIN,
      y: state.y - 12,
      size: 12,
      font: fontBold,
      color: COLOR.text,
    });
    state.y -= 22;

    const stageCounts = meta.stageCounts ?? {};
    const cardWidth = (contentWidth - ARROW_WIDTH * (STAGES.length - 1)) / STAGES.length;
    STAGES.forEach((stage, index) => {
      const x = MARGIN + index * (cardWidth + ARROW_WIDTH);
      const cardBottom = state.y - STAGE_CARD_HEIGHT;
      state.page.drawRectangle({
        x,
        y: cardBottom,
        width: cardWidth,
        height: STAGE_CARD_HEIGHT,
        borderColor: COLOR.border,
        borderWidth: 0.75,
        color: COLOR.white,
      });
      drawCenteredText(state.page, stage, x, cardWidth, cardBottom + 34, fontBold, 8, COLOR.text);
      drawCenteredText(
        state.page,
        String(stageCounts[stage] ?? 0),
        x,
        cardWidth,
        cardBottom + 18,
        fontBold,
        14,
        COLOR.text,
      );
      drawCenteredText(
        state.page,
        'vulnerabilities',
        x,
        cardWidth,
        cardBottom + 6,
        font,
        7,
        COLOR.muted,
      );
      if (index < STAGES.length - 1) {
        drawCenteredText(
          state.page,
          '>',
          x + cardWidth,
          ARROW_WIDTH,
          cardBottom + STAGE_CARD_HEIGHT / 2 - 4,
          font,
          10,
          COLOR.muted,
        );
      }
    });
    state.y -= STAGE_CARD_HEIGHT + 18;

    state.page.drawText('Vulnerabilities', {
      x: MARGIN,
      y: state.y - 12,
      size: 12,
      font: fontBold,
      color: COLOR.text,
    });
    state.y -= 20;
  };

  const measureHeader = () => {
    const headerLines = columnLayouts.map((column) =>
      cellLines(column.title, { ...column, wrap: true }, fontBold),
    );
    return {
      headerLines,
      height: rowHeight(Math.max(...headerLines.map((lines) => lines.length), 1)),
    };
  };

  const drawTableHeader = () => {
    const { headerLines, height } = measureHeader();
    if (!fits(height)) {
      startContinuedPage();
    }
    state.page.drawRectangle({
      x: tableX,
      y: state.y - height,
      width: contentWidth,
      height,
      color: COLOR.headerBg,
    });
    columnLayouts.forEach((column, index) => {
      headerLines[index].forEach((line, lineIndex) => {
        state.page.drawText(line, {
          x: column.x + CELL_PAD_X,
          y: state.y - CELL_PAD_Y - TABLE_FONT_SIZE - lineIndex * TABLE_LINE_HEIGHT,
          size: TABLE_FONT_SIZE,
          font: fontBold,
          color: COLOR.text,
        });
      });
    });
    state.y -= height;
  };

  const drawRow = (vulnerability: Vulnerability, rowIndex: number) => {
    const lines = columnLayouts.map((column) =>
      cellLines(getVulnerabilityColumnValue(column.key, vulnerability), column, font),
    );
    const height = rowHeight(Math.max(...lines.map((cell) => cell.length), 1));
    if (!fits(height)) {
      startContinuedPage();
      drawTableHeader();
    }
    if (rowIndex % 2 === 1) {
      state.page.drawRectangle({
        x: tableX,
        y: state.y - height,
        width: contentWidth,
        height,
        color: COLOR.evenRow,
      });
    }
    columnLayouts.forEach((column, index) => {
      lines[index].forEach((line, lineIndex) => {
        state.page.drawText(line, {
          x: column.x + CELL_PAD_X,
          y: state.y - CELL_PAD_Y - TABLE_FONT_SIZE - lineIndex * TABLE_LINE_HEIGHT,
          size: TABLE_FONT_SIZE,
          font,
          color: COLOR.text,
        });
      });
    });
    state.y -= height;
  };

  drawSummary();
  drawTableHeader();
  vulnerabilities.forEach((vulnerability, index) => {
    drawRow(vulnerability, index);
  });

  return doc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
