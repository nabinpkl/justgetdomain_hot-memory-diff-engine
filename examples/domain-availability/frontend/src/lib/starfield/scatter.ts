import { mulberry32 } from "./seeded-random";

export type Position = { x: number; y: number; rotation: number };

const CELL_W = 180;
const CELL_H = 90;
const JITTER = 28;
const DROP_RATE = 0.3;
const MAX_ROTATION = 2;

export function scatter(
  count: number,
  width: number,
  height: number,
  seed: number,
): Position[] {
  if (count <= 0 || width <= 0 || height <= 0) return [];
  const rng = mulberry32(seed);
  const cols = Math.max(1, Math.floor(width / CELL_W));
  const rows = Math.max(1, Math.floor(height / CELL_H));

  const cells: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rng() < DROP_RATE) continue;
      cells.push({ col: c, row: r });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const cellW = width / cols;
  const cellH = height / rows;
  const out: Position[] = [];
  const limit = Math.min(count, cells.length);
  for (let i = 0; i < limit; i++) {
    const { col, row } = cells[i];
    const cx = col * cellW + cellW / 2;
    const cy = row * cellH + cellH / 2;
    out.push({
      x: cx + (rng() - 0.5) * 2 * JITTER,
      y: cy + (rng() - 0.5) * 2 * JITTER,
      rotation: (rng() - 0.5) * 2 * MAX_ROTATION,
    });
  }
  return out;
}
