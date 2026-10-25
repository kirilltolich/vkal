import { formatDateTime, formatEquivalentMl, formatMl, formatNumber } from './format';

export const MEME_WIDTH = 1080;
export const MEME_HEIGHT = 1350;

const PAD = 72;
const CONTENT_WIDTH = MEME_WIDTH - PAD * 2;

const DISPLAY_FAMILY = '"Unbounded", "Arial Black", "Segoe UI", system-ui, sans-serif';
const BODY_FAMILY = '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif';

const INK = '#f4f4f0';
const MUTED = '#8f949c';
const DIM = '#5f646c';
const PANEL = '#121419';

export interface MemeCardData {
  levelName: string;
  levelIndex: number | null;
  tagline: string;
  phrase: string;
  accent: string;
  ethanolMl: number;
  ethanolMassG: number;
  totalVolumeMl: number;
  equivalentVolumeMl: number | null;
  equivalentLabel: string;
  equivalentStrength: number;
  date: Date;
}

interface FitOptions {
  maxWidth: number;
  maxLines: number;
  startSize: number;
  minSize: number;
  weight: number;
  family: string;
  lineHeightRatio?: number;
}

interface FittedText {
  lines: string[];
  size: number;
  lineHeight: number;
}

type MeasureContext = Pick<CanvasRenderingContext2D, 'measureText'>;

/** Переносит текст по словам, а слишком длинные слова — по символам. */
export function wrapText(ctx: MeasureContext, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    flush();

    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
      continue;
    }

    let buffer = '';
    for (const char of word) {
      if (buffer && ctx.measureText(buffer + char).width > maxWidth) {
        lines.push(buffer);
        buffer = char;
      } else {
        buffer += char;
      }
    }
    current = buffer;
  }

  flush();
  return lines.length > 0 ? lines : [''];
}

function fitText(ctx: CanvasRenderingContext2D, text: string, options: FitOptions): FittedText {
  const { maxWidth, maxLines, startSize, minSize, weight, family } = options;
  const ratio = options.lineHeightRatio ?? 1.2;

  let size = startSize;
  let lines = [text];

  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) {
      return { lines, size, lineHeight: size * ratio };
    }
    size -= 2;
  }

  ctx.font = `${weight} ${minSize}px ${family}`;
  lines = wrapText(ctx, text, maxWidth);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1] ?? '';
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    lines = kept;
  }

  return { lines, size: minSize, lineHeight: minSize * ratio };
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  lineHeight: number,
  align: CanvasTextAlign = 'left',
): void {
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.34;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, accent: string): void {
  ctx.fillStyle = '#08090b';
  ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT);

  const glow = ctx.createRadialGradient(930, -80, 30, 930, -80, 880);
  glow.addColorStop(0, hexToRgba(accent, 0.3));
  glow.addColorStop(1, 'rgba(8, 9, 11, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT);

  const pinkGlow = ctx.createRadialGradient(-120, 1220, 20, -120, 1220, 760);
  pinkGlow.addColorStop(0, 'rgba(255, 61, 139, 0.16)');
  pinkGlow.addColorStop(1, 'rgba(8, 9, 11, 0)');
  ctx.fillStyle = pinkGlow;
  ctx.fillRect(0, 0, MEME_WIDTH, MEME_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.032;
  ctx.fillStyle = '#ffffff';
  for (let x = -500; x < MEME_WIDTH + 500; x += 58) {
    ctx.save();
    ctx.translate(x, 0);
    ctx.rotate(-0.32);
    ctx.fillRect(0, -200, 16, MEME_HEIGHT + 500);
    ctx.restore();
  }
  ctx.restore();

  let seed = 20261025;
  const random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 380; i += 1) {
    ctx.fillStyle = `rgba(255, 255, 255, ${random() * 0.05})`;
    ctx.fillRect(random() * MEME_WIDTH, random() * MEME_HEIGHT, 2, 2);
  }

  ctx.save();
  ctx.strokeStyle = hexToRgba(accent, 0.22);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(1010, 720, 210, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1010, 720, 268, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawStar(ctx, 1016, 410, 22, hexToRgba(accent, 0.85));
  drawStar(ctx, 46, 640, 13, 'rgba(255, 61, 139, 0.7)');
  drawStar(ctx, 60, 1150, 9, 'rgba(255, 255, 255, 0.35)');

  ctx.fillStyle = hexToRgba(accent, 0.5);
  ctx.fillRect(24, 244, 22, 8);
  ctx.fillRect(24, 262, 8, 22);
  ctx.fillRect(24, 244, 8, 22);
}

function drawHeader(ctx: CanvasRenderingContext2D, accent: string): void {
  ctx.save();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, MEME_WIDTH, 14);

  ctx.font = `600 21px ${BODY_FAMILY}`;
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('МЕМ-КАРТОЧКА · ЭТАНОЛ-КАЛЬКУЛЯТОР', PAD, 84);

  ctx.font = `900 94px ${DISPLAY_FAMILY}`;
  const prefix = 'В ';
  const prefixWidth = ctx.measureText(prefix).width;
  ctx.fillStyle = accent;
  ctx.fillText('В', PAD, 190);
  ctx.fillStyle = INK;
  ctx.fillText('ГОВНО', PAD + prefixWidth, 190);

  ctx.fillStyle = hexToRgba(accent, 0.85);
  ctx.fillRect(PAD, 210, 188, 7);

  ctx.strokeStyle = hexToRgba(accent, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(974, 132, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = `700 27px ${BODY_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('18+', 974, 134);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, 232);
  ctx.lineTo(MEME_WIDTH - PAD, 232);
  ctx.stroke();
  ctx.restore();
}

function drawLevel(
  ctx: CanvasRenderingContext2D,
  data: MemeCardData,
  accent: string,
): void {
  const pillLabel =
    data.levelIndex === null ? 'БЕЗ УРОВНЯ' : `УРОВЕНЬ ${data.levelIndex} / 7`;

  ctx.save();
  ctx.font = `700 24px ${BODY_FAMILY}`;
  const labelWidth = ctx.measureText(pillLabel).width;
  roundedRect(ctx, PAD, 260, labelWidth + 56, 52, 26);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = '#08090b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillLabel, PAD + 28, 288);

  const nameFit = fitText(ctx, data.levelName, {
    maxWidth: CONTENT_WIDTH,
    maxLines: 3,
    startSize: 64,
    minSize: 36,
    weight: 800,
    family: DISPLAY_FAMILY,
    lineHeightRatio: 1.1,
  });

  const blockHeight = nameFit.lines.length * nameFit.lineHeight + 40;
  const blockTop = 338 + Math.max(0, (250 - blockHeight) / 2);

  ctx.font = `800 ${nameFit.size}px ${DISPLAY_FAMILY}`;
  ctx.fillStyle = INK;
  drawLines(ctx, nameFit.lines, PAD, blockTop, nameFit.lineHeight);

  ctx.font = `600 20px ${BODY_FAMILY}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    data.tagline.toUpperCase(),
    PAD,
    blockTop + nameFit.lines.length * nameFit.lineHeight + 12,
  );
  ctx.restore();
}

function drawPhrase(
  ctx: CanvasRenderingContext2D,
  phrase: string,
  accent: string,
): void {
  const panelTop = 620;
  const panelHeight = 300;

  ctx.save();
  roundedRect(ctx, PAD, panelTop, CONTENT_WIDTH, panelHeight, 32);
  ctx.fillStyle = PANEL;
  ctx.fill();
  ctx.strokeStyle = hexToRgba(accent, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();

  roundedRect(ctx, PAD, panelTop, 10, panelHeight, 6);
  ctx.fillStyle = accent;
  ctx.fill();

  const fit = fitText(ctx, phrase, {
    maxWidth: CONTENT_WIDTH - 104,
    maxLines: 6,
    startSize: 46,
    minSize: 27,
    weight: 700,
    family: DISPLAY_FAMILY,
    lineHeightRatio: 1.32,
  });

  const textHeight = fit.lines.length * fit.lineHeight;
  const textTop = panelTop + (panelHeight - textHeight) / 2 - 2;

  ctx.font = `700 ${fit.size}px ${DISPLAY_FAMILY}`;
  ctx.fillStyle = INK;
  drawLines(ctx, fit.lines, PAD + 52, textTop, fit.lineHeight, 'left');
  ctx.restore();
}

function drawStatTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  accent: string,
): void {
  ctx.save();
  roundedRect(ctx, x, y, width, height, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = `600 16px ${BODY_FAMILY}`;
  ctx.fillStyle = MUTED;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + 22, y + 22);

  const fit = fitText(ctx, value, {
    maxWidth: width - 44,
    maxLines: 1,
    startSize: 40,
    minSize: 24,
    weight: 700,
    family: DISPLAY_FAMILY,
  });

  ctx.font = `700 ${fit.size}px ${DISPLAY_FAMILY}`;
  ctx.fillStyle = accent;
  ctx.fillText(fit.lines[0] ?? value, x + 22, y + 72);
  ctx.restore();
}

function drawStats(ctx: CanvasRenderingContext2D, data: MemeCardData, accent: string): void {
  const gap = 18;
  const tileWidth = (CONTENT_WIDTH - gap * 2) / 3;
  const top = 952;
  const height = 148;

  drawStatTile(
    ctx,
    PAD,
    top,
    tileWidth,
    height,
    'ЧИСТЫЙ ЭТАНОЛ',
    formatMl(data.ethanolMl),
    INK,
  );
  drawStatTile(
    ctx,
    PAD + tileWidth + gap,
    top,
    tileWidth,
    height,
    'МАССА ЭТАНОЛА',
    `${formatNumber(data.ethanolMassG)} г`,
    INK,
  );
  drawStatTile(
    ctx,
    PAD + (tileWidth + gap) * 2,
    top,
    tileWidth,
    height,
    'ВСЕГО ВЫПИТО',
    `${formatNumber(data.totalVolumeMl)} мл`,
    accent,
  );

  const equivTop = 1122;
  const equivHeight = 96;
  roundedRect(ctx, PAD, equivTop, CONTENT_WIDTH, equivHeight, 24);
  ctx.fillStyle = accent;
  ctx.fill();

  ctx.font = `600 15px ${BODY_FAMILY}`;
  ctx.fillStyle = 'rgba(8, 9, 11, 0.65)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ЭКВИВАЛЕНТ ПО ЧИСТОМУ ЭТАНОЛУ', PAD + 28, equivTop + 20);

  const equivValue =
    data.equivalentVolumeMl === null
      ? '—'
      : `≈ ${formatEquivalentMl(data.equivalentVolumeMl)} · ${data.equivalentLabel.toUpperCase()}`;

  const valueFit = fitText(ctx, equivValue, {
    maxWidth: CONTENT_WIDTH - 56 - 120,
    maxLines: 1,
    startSize: 38,
    minSize: 22,
    weight: 700,
    family: DISPLAY_FAMILY,
  });

  ctx.font = `700 ${valueFit.size}px ${DISPLAY_FAMILY}`;
  ctx.fillStyle = '#08090b';
  ctx.fillText(valueFit.lines[0] ?? equivValue, PAD + 28, equivTop + 48);

  const strengthText =
    data.equivalentStrength > 0 ? `${formatNumber(data.equivalentStrength)}%` : '—';
  ctx.font = `700 26px ${BODY_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(strengthText, MEME_WIDTH - PAD - 28, equivTop + equivHeight / 2 + 2);
}

function drawFooter(ctx: CanvasRenderingContext2D, data: MemeCardData): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 1248);
  ctx.lineTo(MEME_WIDTH - PAD, 1248);
  ctx.stroke();

  const disclaimerFit = fitText(
    ctx,
    'Это развлекательный расчёт количества этанола, а не измеритель опьянения. Не определяет концентрацию алкоголя в крови, способность управлять транспортом или безопасность состояния.',
    {
      maxWidth: CONTENT_WIDTH,
      maxLines: 2,
      startSize: 17,
      minSize: 13,
      weight: 500,
      family: BODY_FAMILY,
      lineHeightRatio: 1.4,
    },
  );

  ctx.font = `500 ${disclaimerFit.size}px ${BODY_FAMILY}`;
  ctx.fillStyle = MUTED;
  drawLines(ctx, disclaimerFit.lines, PAD, 1266, disclaimerFit.lineHeight);

  ctx.font = `600 16px ${BODY_FAMILY}`;
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('18+ · шутка, а не диагноз', PAD, 1330);
  ctx.textAlign = 'right';
  ctx.fillText(formatDateTime(data.date), MEME_WIDTH - PAD, 1330);
  ctx.restore();
}

async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`900 94px "Unbounded"`),
      document.fonts.load(`800 64px "Unbounded"`),
      document.fonts.load(`700 46px "Unbounded"`),
      document.fonts.load(`600 21px "Inter"`),
      document.fonts.load(`500 17px "Inter"`),
    ]);
    await document.fonts.ready;
  } catch {
    // Если внешний шрифт не загрузился, canvas использует системный fallback.
  }
}

/**
 * Рисует мем-карточку 1080×1350 и возвращает настоящий PNG-Blob.
 * Никаких внешних картинок — только Canvas, поэтому CORS-проблем нет.
 */
export async function renderMemeCardPng(data: MemeCardData): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Генерация карточки доступна только в браузере.');
  }

  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = MEME_WIDTH;
  canvas.height = MEME_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D недоступен в этом браузере.');
  }

  const accent = data.accent;

  drawBackground(ctx, accent);
  drawHeader(ctx, accent);
  drawLevel(ctx, data, accent);
  drawPhrase(ctx, data.phrase, accent);
  drawStats(ctx, data, accent);
  drawFooter(ctx, data);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Не удалось собрать PNG. Попробуй ещё раз.'));
    }, 'image/png');
  });
}

export function createMemeFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `v-govno-${year}-${month}-${day}.png`;
}
