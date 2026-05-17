import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Stroke } from '../types/character';

interface StrokeAnimationProps {
  strokes: Stroke[];
  onComplete?: () => void;
}

export default function StrokeAnimation({ strokes, onComplete }: StrokeAnimationProps) {
  const fillRefs = useRef<(SVGGElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!fillRefs.current.length) return;

    // Kill existing timeline
    timelineRef.current?.kill();

    // Set initial state - all fills hidden
    fillRefs.current.forEach((fillRef) => {
      if (fillRef) {
        fillRef.style.clipPath = 'inset(0% 100% 0 0)';
      }
    });

    // Create new timeline
    timelineRef.current = gsap.timeline({
      onComplete: () => onComplete?.(),
    });

    let cumulativeDelay = 0;

    strokes.forEach((_, index) => {
      const fillRef = fillRefs.current[index];
      const path = fillRef?.querySelector('path');
      if (!fillRef || !path) return;

      // Detect stroke direction
      const length = (path as SVGPathElement).getTotalLength?.() || 1000;
      const points: { x: number; y: number }[] = [];
      const numSamples = Math.min(20, Math.floor(length / 10));
      for (let i = 0; i <= numSamples; i++) {
        try {
          const point = (path as SVGPathElement).getPointAtLength((i / numSamples) * length);
          points.push({ x: point.x, y: point.y });
        } catch {
          points.push({ x: 512, y: 512 });
        }
      }

      const xs = points.map(p => p.x);
      const ys = points.map(p => p.y);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);
      const isHorizontal = width > height * 1.2;

      const duration = strokes[index]?.duration || 800;
      const delaySeconds = cumulativeDelay / 1000;

      timelineRef.current!.to(
        fillRef,
        {
          clipPath: isHorizontal
            ? 'inset(0% 0% 0 0)'   // Reveal from left to right
            : 'inset(0% 0 0 0)',    // Reveal from top to bottom
          duration: duration / 1000,
          ease: 'power2.inOut',
        },
        delaySeconds
      );

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
      </svg>
    </div>
  );
}