import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Stroke } from '../types/character';

interface StrokeAnimationProps {
  strokes: Stroke[];
  onComplete?: () => void;
}

export default function StrokeAnimation({ strokes, onComplete }: StrokeAnimationProps) {
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const fillRef = useRef<SVGGElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!pathsRef.current.length) return;

    // Reset all paths to invisible (outline phase)
    pathsRef.current.forEach((path) => {
      if (path) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        path.style.opacity = '1';
      }
    });

    // Reset fill to hidden
    if (fillRef.current) {
      fillRef.current.style.clipPath = 'inset(100% 0 0 0)';
    }

    // Kill existing timeline
    timelineRef.current?.kill();

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

    // Phase 2: Fill animation - reveal from top-left to bottom-right
    const fillDelay = cumulativeDelay + 200;
    if (fillRef.current) {
      // Animate clip-path from top (inset top 0, bottom 100%) to no clip (inset 0)
      // This creates a sweeping motion from top to bottom, simulating left-to-right, top-to-bottom fill
      timelineRef.current!.to(
        fillRef.current,
        {
          clipPath: 'inset(0% 0 0 0)',
          duration: 1.2,
          ease: 'power2.inOut',
        },
        fillDelay / 1000
      );
    }
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
        {/* Filled character layer - revealed after outlines */}
        <g ref={fillRef} style={{ clipPath: 'inset(100% 0 0 0)' }}>
          {strokes.map((stroke, index) => (
            <path
              key={`fill-${index}`}
              d={stroke.path}
              fill="#1f2937"
              stroke="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* Stroke outlines (drawn first, then fade out as fill appears) */}
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