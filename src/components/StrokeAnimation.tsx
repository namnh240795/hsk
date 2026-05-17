import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Stroke } from '../types/character';

interface StrokeAnimationProps {
  strokes: Stroke[];
  onComplete?: () => void;
}

type StrokeDirection = 'horizontal' | 'vertical';

export default function StrokeAnimation({ strokes, onComplete }: StrokeAnimationProps) {
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const fillRefs = useRef<(SVGGElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!pathsRef.current.length || !fillRefs.current.length) return;

    // Reset all outline paths to invisible
    pathsRef.current.forEach((path) => {
      if (path) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.opacity = '1';
      }
    });

    // Reset all fill paths (hidden by clip)
    fillRefs.current.forEach((fillRef) => {
      if (fillRef) {
        fillRef.style.clipPath = 'inset(0% 100% 0 0)'; // Fully hidden
      }
    });

    // Kill existing timeline
    timelineRef.current?.kill();

    // Analyze strokes to get directions
    const patterns = strokes.map((_, index) => {
      const path = pathsRef.current[index];
      if (!path) return { direction: 'horizontal' as StrokeDirection, clipPath: 'inset(0% 0 0 0)' };

      const length = path.getTotalLength();
      const points: { x: number; y: number }[] = [];
      const numSamples = Math.min(20, Math.floor(length / 10));
      for (let i = 0; i <= numSamples; i++) {
        const point = path.getPointAtLength((i / numSamples) * length);
        points.push({ x: point.x, y: point.y });
      }

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const width = maxX - minX;
      const height = maxY - minY;

      const direction: StrokeDirection = width > height * 1.2 ? 'horizontal' : 'vertical';

      return {
        direction,
        clipPath: direction === 'horizontal'
          ? 'inset(0% 100% 0 0)' // Clip from left (hide left side)
          : 'inset(100% 0 0 0)'  // Clip from top (hide top side)
      };
    });

    // Create new timeline
    timelineRef.current = gsap.timeline({
      onComplete: () => onComplete?.(),
    });

    let cumulativeDelay = 0;

    // Phase 1: Animate stroke outlines (reverse order)
    [...strokes].reverse().forEach((stroke, index) => {
      const path = pathsRef.current[strokes.length - 1 - index];
      if (!path) return;

      const duration = stroke.duration || 800;
      const delaySeconds = cumulativeDelay / 1000;

      timelineRef.current!.to(
        path,
        {
          strokeDashoffset: 0,
          duration: duration / 1000,
          ease: 'power2.inOut',
        },
        delaySeconds
      );

      cumulativeDelay += duration + 300;
    });

    // Phase 2: Animate fills based on detected direction
    const fillDelay = cumulativeDelay + 200;

    strokes.forEach((_, index) => {
      const fillRef = fillRefs.current[index];
      if (!fillRef) return;

      const pattern = patterns[index];

      timelineRef.current!.to(
        fillRef,
        {
          clipPath: pattern.direction === 'horizontal'
            ? 'inset(0% 0% 0 0)'  // Reveal fully from left
            : 'inset(0% 0 0 0)',   // Reveal fully from top
          duration: 0.8,
          ease: 'power2.inOut',
        },
        (fillDelay + index * 100) / 1000
      );
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
        {/* Filled character layers - each stroke reveals based on its direction */}
        {strokes.map((stroke, index) => (
          <g
            key={`fill-${index}`}
            ref={(el) => { fillRefs.current[index] = el; }}
            style={{ clipPath: 'inset(0% 100% 0 0)' }}
          >
            <path
              d={stroke.path}
              fill="#1f2937"
              stroke="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}

        {/* Stroke outlines (drawn first) */}
        {strokes.map((stroke, index) => (
          <path
            key={`outline-${index}`}
            ref={(el) => { pathsRef.current[index] = el; }}
            d={stroke.path}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}