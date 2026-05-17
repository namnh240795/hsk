import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Stroke } from '../types/character';

interface StrokeAnimationProps {
  strokes: Stroke[];
  onComplete?: () => void;
}

interface PathSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 'horizontal' | 'vertical';
}

function analyzePathSegments(path: SVGPathElement): PathSegment[] {
  const length = path.getTotalLength();
  const numSamples = 30;
  const points: { x: number; y: number }[] = [];

  for (let i = 0; i <= numSamples; i++) {
    try {
      const point = path.getPointAtLength((i / numSamples) * length);
      points.push({ x: point.x, y: point.y });
    } catch {
      // Skip invalid points
    }
  }

  if (points.length < 2) return [];

  const segments: PathSegment[] = [];
  let currentSegment: { points: typeof points; direction: 'horizontal' | 'vertical' } | null = null;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (segmentLength < 10) continue;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const direction = isHorizontal ? 'horizontal' : 'vertical';

    if (currentSegment === null) {
      currentSegment = { points: [points[i]], direction };
    } else if (currentSegment.direction === direction) {
      currentSegment.points.push(points[i]);
    } else {
      if (currentSegment.points.length >= 2) {
        const start = currentSegment.points[0];
        const end = currentSegment.points[currentSegment.points.length - 1];
        segments.push({
          startX: start.x,
          startY: start.y,
          endX: end.x,
          endY: end.y,
          direction: currentSegment.direction,
        });
      }
      currentSegment = { points: [points[i]], direction };
    }
  }

  if (currentSegment && currentSegment.points.length >= 2) {
    const start = currentSegment.points[0];
    const end = currentSegment.points[currentSegment.points.length - 1];
    segments.push({
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      direction: currentSegment.direction,
    });
  }

  return segments;
}

export default function StrokeAnimation({ strokes, onComplete }: StrokeAnimationProps) {
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!pathRefs.current.length) return;

    timelineRef.current?.kill();

    const allSegments = pathRefs.current.map((path) => {
      if (!path) return [];
      return analyzePathSegments(path);
    });

    timelineRef.current = gsap.timeline({
      onComplete: () => onComplete?.(),
    });

    let cumulativeDelay = 0;

    strokes.forEach((stroke, index) => {
      const path = pathRefs.current[index];
      if (!path) return;

      const segments = allSegments[index];
      const duration = stroke.duration || 800;
      const delaySeconds = cumulativeDelay / 1000;

      // Get bounding box of entire stroke
      const pathLength = path.getTotalLength();
      const points: { x: number; y: number }[] = [];
      const numSamples = 20;
      for (let i = 0; i <= numSamples; i++) {
        try {
          points.push(path.getPointAtLength((i / numSamples) * pathLength));
        } catch {
          points.push({ x: 512, y: 512 });
        }
      }

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = maxX - minX;
      const height = maxY - minY;

      // Determine overall stroke direction and fill direction
      // Horizontal: fill left (minX) to right (maxX)
      // Vertical: fill top (minY) to bottom (maxY)
      if (segments.length <= 1) {
        // Simple stroke - use bounding box to determine fill direction
        path.style.clipPath = width > height
          ? 'inset(0% 0 0 100%)'  // Hide left, reveal left-to-right
          : 'inset(0 0 0 0)';      // For vertical, hide top to reveal top-to-bottom

        path.style.clipPath = width > height
          ? 'inset(0% 0 0 100%)'  // left to right
          : 'inset(100% 0 0 0)';  // top to bottom

        timelineRef.current!.to(
          path,
          {
            clipPath: 'inset(0% 0 0 0)',
            duration: duration / 1000,
            ease: 'power2.inOut',
          },
          delaySeconds
        );
      } else {
        // Complex stroke with multiple segments
        // Determine fill direction based on first segment's start point
        const firstSeg = segments[0];
        const isHorizontal = firstSeg.direction === 'horizontal';

        if (isHorizontal) {
          // Horizontal first - fill left to right
          path.style.clipPath = 'inset(0% 0 0 100%)';

          // Progressive reveal for each segment
          segments.forEach((_, segIndex) => {
            const progress = ((segIndex + 1) / segments.length);
            const clipValue = 100 - progress * 100;

            timelineRef.current!.to(
              path,
              {
                clipPath: `inset(0% ${clipValue}% 0 0)`,
                duration: (duration / 1000) / segments.length,
                ease: 'power2.inOut',
              },
              delaySeconds + (segIndex * (duration / 1000) / segments.length)
            );
          });
        } else {
          // Vertical first - fill top to bottom
          path.style.clipPath = 'inset(100% 0 0 0)';

          // Progressive reveal for each segment
          segments.forEach((_, segIndex) => {
            const progress = ((segIndex + 1) / segments.length);
            const clipValue = 100 - progress * 100;

            timelineRef.current!.to(
              path,
              {
                clipPath: `inset(${clipValue}% 0 0 0)`,
                duration: (duration / 1000) / segments.length,
                ease: 'power2.inOut',
              },
              delaySeconds + (segIndex * (duration / 1000) / segments.length)
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
      timelineRef.current?.kill();
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