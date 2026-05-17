import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Stroke } from '../types/character';

interface StrokeAnimationProps {
  strokes: Stroke[];
  onComplete?: () => void;
}

export default function StrokeAnimation({ strokes, onComplete }: StrokeAnimationProps) {
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const replay = useCallback(() => {
    if (!pathsRef.current.length) return;

    // Reset all paths to invisible (fully drawn)
    pathsRef.current.forEach((path) => {
      if (path) {
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = '0';
      }
    });

    // Kill existing timeline
    timelineRef.current?.kill();

    // Create new timeline
    timelineRef.current = gsap.timeline({
      onComplete: () => onComplete?.(),
    });

    let cumulativeDelay = 0;

    strokes.forEach((stroke, index) => {
      const path = pathsRef.current[index];
      if (!path) return;

      const duration = stroke.duration || 800;
      const delaySeconds = cumulativeDelay / 1000;

      timelineRef.current!.to(
        path,
        {
          strokeDashoffset: path.getTotalLength(),
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
          <path
            key={index}
            ref={(el) => { pathsRef.current[index] = el; }}
            d={stroke.path}
            fill="none"
            stroke="#2563eb"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}