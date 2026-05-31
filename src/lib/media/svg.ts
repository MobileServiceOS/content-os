// Builds a self-contained SVG placeholder image as a data URL. Used by the mock
// image/video providers so the whole media flow works with zero external API.
import { ASPECT_DIMENSIONS, type AspectRatio } from '../../types/media';

const escapeXml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));

/** Wrap text into <= `perLine`-char lines (max `maxLines`). */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine) {
      lines.push(cur.trim());
      cur = w;
      if (lines.length >= maxLines) break;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur.trim());
  return lines;
}

export function placeholderSvgDataUrl(
  prompt: string,
  aspect: AspectRatio,
  label: string,
  badge: string,
): string {
  const { width: w, height: h } = ASPECT_DIMENSIONS[aspect];
  const lines = wrap(escapeXml(prompt) || 'Generated image', 26, 5);
  const startY = h / 2 - (lines.length - 1) * 30;
  const texts = lines
    .map((l, i) => `<text x="${w / 2}" y="${startY + i * 60}" fill="#e8edf6" font-size="40" font-family="sans-serif" text-anchor="middle">${l}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a2438"/><stop offset="1" stop-color="#3b73e0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="${w / 2}" y="80" fill="#93a1bd" font-size="34" font-family="sans-serif" text-anchor="middle">${escapeXml(badge)}</text>
    ${texts}
    <text x="${w / 2}" y="${h - 60}" fill="#93a1bd" font-size="30" font-family="sans-serif" text-anchor="middle">${escapeXml(label)}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
