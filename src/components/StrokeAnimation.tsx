import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Stroke } from '../types/character';

interface StrokeAnimationProps {
  strokes: Stroke[];
  onComplete?: () => void;
}

interface Segment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 'horizontal' | 'vertical';
}

/**
 * Rule-based stroke fill animation:
 *
 * 1. SIMPLE STROKE (single direction):
 *    - Horizontal: fill from left edge to right edge
 *    - Vertical: fill from top edge to bottom edge
 *
 * 2. COMPLEX STROKE (multiple segments):
 *    - First segment determines primary fill direction
 *    - Horizontal-then-vertical → fill left to right, then top to bottom
 *    - Vertical-then-horizontal → fill top to bottom, then left to right
 *    - Each segment reveals in sequential order matching natural writing
 *
 * 3. IMPLEMENTATION:
 *    - Use bounding box analysis to determine stroke direction
 *    - clip-path inset reveals from appropriate edge
 *    - For complex strokes, use progressive reveal that follows writing order
 */

function analyzeStrokeDirection(path: SVGPathElement): {
  isHorizontal: boolean;
  startSide: 'left' | 'top';
  segments: Segment[];
} {
  const length = path.getTotalLength();
  const points: { x: number; y: number }[] = [];
  const numSamples = 30;

  for (let i = 0; i <= numSamples; i++) {
    try {
      const point = path.getPointAtLength((i / numSamples) * length);
      points.push({ x: point.x, y: point.y });
    } catch {
      points.push({ x: 512, y: 512 });
    }
  }

  // Calculate bounding box
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  // Determine if stroke is primarily horizontal or vertical
  // using overall bounding box (not per-segment)
  const isHorizontal = width > height;

  // Determine which edge is the START (where fill begins)
  // For horizontal: left edge is start (fill goes left → right)
  // For vertical: top edge is start (fill goes top → bottom)
  const startSide = isHorizontal ? 'left' : 'top';

  // Analyze segments to detect direction changes
  const segments: Segment[] = [];
  let currentSeg: { points: typeof points; direction: 'horizontal' | 'vertical' } | null = null;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    if (segLen < 10) continue;

    const isHoriz = Math.abs(dx) > Math.abs(dy);
    const direction = isHoriz ? 'horizontal' : 'vertical';

    if (currentSeg === null) {
      currentSeg = { points: [points[i]], direction };
    } else if (currentSeg.direction === direction) {
      currentSeg.points.push(points[i]);
    } else {
      // Direction changed
      if (currentSeg.points.length >= 2) {
        segments.push({
          startX: currentSeg.points[0].x,
          startY: currentSeg.points[0].y,
          endX: currentSeg.points[currentSeg.points.length - 1].x,
          endY: currentSeg.points[currentSeg.points.length - 1].y,
          direction: currentSeg.direction,
        });
      }
      currentSeg = { points: [points[i]], direction };
    }
  }

  // Add final segment
  if (currentSeg && currentSeg.points.length >= 2) {
    segments.push({
      startX: currentSeg.points[0].x,
      startY: currentSeg.points[0].y,
      endX: currentSeg.points[currentSeg.points.length - 1].x,
      endY: currentSeg.points[currentSeg.points.length - 1].y,
      direction: currentSeg.direction,
    });
  }

  return { isHorizontal, startSide, segments };
}

export default function StrokeAnimation({ strokes, onComplete }: StrokeAnimationProps) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!pathRefs.current.length) return;

    timelineRef.current?.kill();
    timelineRef.current = gsap.timeline({
      onComplete: () => onComplete?.(),
    });

    let cumulativeDelay = 0;

    strokes.forEach((stroke, index) => {
      const path = pathRefs.current[index];
      if (!path) return;

      const duration = stroke.duration || 800;
      const delaySeconds = cumulativeDelay / 1000;

      // Analyze stroke to determine fill direction
      const { isHorizontal, segments } = analyzeStrokeDirection(path);

      if (segments.length <= 1) {
        // Simple stroke: single direction
        if (isHorizontal) {
          // Horizontal stroke: fill left to right
          path.style.clipPath = 'inset(0% 0 0 100%)';

          timelineRef.current!.to(
            path,
            { clipPath: 'inset(0% 0 0 0%)', duration: duration / 1000, ease: 'power2.inOut' },
            delaySeconds
          );
        } else {
          // Vertical stroke: fill top to bottom
          path.style.clipPath = 'inset(100% 0 0 0)';

          timelineRef.current!.to(
            path,
            { clipPath: 'inset(0% 0 0 0)', duration: duration / 1000, ease: 'power2.inOut' },
            delaySeconds
          );
        }
      } else {
        // Complex stroke: multiple segments
        // First segment determines primary fill direction
        const firstSegDir = segments[0].direction;

        if (firstSegDir === 'horizontal') {
          // Horizontal-first: fill left to right progressively
          path.style.clipPath = 'inset(0% 0 0 100%)';

          const segDuration = (duration / 1000) / segments.length;
          segments.forEach((_, segIdx) => {
            const progress = ((segIdx + 1) / segments.length);
            const rightClip = 100 - progress * 100;

            timelineRef.current!.to(
              path,
              { clipPath: `inset(0% ${rightClip}% 0 0)`, duration: segDuration, ease: 'power2.inOut' },
              delaySeconds + segIdx * segDuration
            );
          });
        } else {
          // Vertical-first: fill top to bottom progressively
          path.style.clipPath = 'inset(100% 0 0 0)';

          const segDuration = (duration / 1000) / segments.length;
          segments.forEach((_, segIdx) => {
            const progress = ((segIdx + 1) / segments.length);
            const topClip = 100 - progress * 100;

            timelineRef.current!.to(
              path,
              { clipPath: `inset(${topClip}% 0 0 0)`, duration: segDuration, ease: 'power2.inOut' },
              delaySeconds + segIdx * segDuration
            );
          });
        }
      }

      cumulativeDelay += duration + 300;
    });
  }, [strokes, onComplete]);

  useEffect(() => {
    replay();
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [replay]);

  return (
    <div className="relative w-full h-full">
      <svg viewBox="0 0 1024 1024" className="w-full h-full">
        {strokes.map((stroke, index) => (
          <path
            key={`fill-${index}`}
            ref={(el) => { pathRefs.current[index] = el; }}
            d={stroke.path}
            fill="#1f2937"
            stroke="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ clipPath: 'inset(0% 0 0 100%)' }}
          />
        ))}
      </svg>
    </div>
  );
}