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

  // Detect direction changes and group points into segments
  let currentSegment: { points: typeof points; direction: 'horizontal' | 'vertical' } | null = null;

  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    // Skip very short segments (likely noise)
    if (segmentLength < 10) continue;

    const isHorizontal = Math.abs(dx) > Math.abs(dy);
    const direction = isHorizontal ? 'horizontal' : 'vertical';

    if (currentSegment === null) {
      currentSegment = { points: [points[i]], direction };
    } else if (currentSegment.direction === direction) {
      currentSegment.points.push(points[i]);
    } else {
      // Direction changed - save current segment and start new one
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

  // Don't forget the last segment
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
  const containerRef = useRef<SVGGElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!containerRef.current || !pathRefs.current.length) return;

    // Kill existing timeline
    timelineRef.current?.kill();

    // Analyze each stroke to get segments
    const allSegments = pathRefs.current.map((path) => {
      if (!path) return [];
      return analyzePathSegments(path);
    });

    // Create new timeline
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

      if (segments.length <= 1) {
        // Simple case: single direction stroke
        const pathLength = path.getTotalLength();
        const points = [];
        const numSamples = 10;
        for (let i = 0; i <= numSamples; i++) {
          try {
            points.push(path.getPointAtLength((i / numSamples) * pathLength));
          } catch {
            points.push({ x: 512, y: 512 });
          }
        }

        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const width = Math.max(...xs) - Math.min(...xs);
        const height = Math.max(...ys) - Math.min(...ys);
        const isHorizontal = width > height * 1.2;

        // Set initial clip
        path.style.clipPath = isHorizontal
          ? 'inset(0% 0 0 100%)'
          : 'inset(100% 0 0 0)';

        // Animate to reveal
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
        // Complex stroke: animate in segments
        path.style.clipPath = 'inset(0% 0 0 100%)';

        // Create staggered reveal for each segment
        const segmentDuration = (duration / 1000) / segments.length;
        const segmentDelay = delaySeconds;

        segments.forEach((seg, segIndex) => {
          const clipStart = seg.direction === 'horizontal'
            ? `inset(0% 0 0 ${100 - ((segIndex + 1) / segments.length) * 100}%)`
            : `inset(${100 - ((segIndex + 1) / segments.length) * 100}% 0 0 0)`;

          timelineRef.current!.to(
            path,
            {
              clipPath: clipStart,
              duration: segmentDuration,
              ease: 'power2.inOut',
            },
            segmentDelay + segIndex * segmentDuration
          );
        });
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