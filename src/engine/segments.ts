import type { Obstacle, WallSegment } from './types';

interface Interval {
  start: number;
  end: number;
}

/**
 * Computes clear horizontal intervals along [0, wallLength] after subtracting
 * any architectural openings (doors or low windows) that intersect [bandBottom, bandTop].
 */
export function computeClearRuns(
  wallLength: number,
  obstacles: Obstacle[],
  bandBottom: number,
  bandTop: number,
  minSegmentMm = 1
): WallSegment[] {
  const blocked: Interval[] = [];

  for (const obs of obstacles) {
    if (obs.type !== 'door' && obs.type !== 'window') continue;
    const arch = Math.max(0, obs.architraveMm ?? (obs.type === 'door' ? 70 : 0));
    const obsBottom = obs.y - (obs.type === 'window' ? arch : 0);
    const obsTop = obs.y + obs.height + arch;

    // Does the opening intersect the vertical band?
    if (obsBottom < bandTop && obsTop > bandBottom) {
      const start = Math.max(0, obs.x - arch);
      const end = Math.min(wallLength, obs.x + obs.width + arch);
      if (end > start) {
        blocked.push({ start, end });
      }
    }
  }

  if (blocked.length === 0) {
    return [
      {
        index: 0,
        startX: 0,
        endX: wallLength,
        length: wallLength,
        leftBoundary: 'wall',
        rightBoundary: 'wall'
      }
    ];
  }

  // Merge overlapping blocked intervals
  blocked.sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const iv of blocked) {
    const prev = merged[merged.length - 1];
    if (prev && iv.start <= prev.end) {
      prev.end = Math.max(prev.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }

  // Invert blocked intervals into clear segments
  const segments: WallSegment[] = [];
  let cursor = 0;

  for (const iv of merged) {
    if (iv.start - cursor >= minSegmentMm) {
      segments.push({
        index: segments.length,
        startX: cursor,
        endX: iv.start,
        length: iv.start - cursor,
        leftBoundary: cursor === 0 ? 'wall' : 'opening',
        rightBoundary: 'opening'
      });
    }
    cursor = Math.max(cursor, iv.end);
  }

  if (wallLength - cursor >= minSegmentMm) {
    segments.push({
      index: segments.length,
      startX: cursor,
      endX: wallLength,
      length: wallLength - cursor,
      leftBoundary: cursor === 0 ? 'wall' : 'opening',
      rightBoundary: 'wall'
    });
  }

  return segments;
}
