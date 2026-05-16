import { useState } from 'react';
import StrokeAnimation from './StrokeAnimation';
import { CharacterData } from '../types/character';

interface CharacterDisplayProps {
  character: CharacterData;
  isAnimating: boolean;
}

export default function CharacterDisplay({ character, isAnimating }: CharacterDisplayProps) {
  const [showAnimation, setShowAnimation] = useState(true);

  return (
    <div className="relative w-64 h-64 mx-auto">
      {/* Character */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-8xl font-bold text-gray-900">
          {character.character}
        </span>
      </div>

      {/* Stroke animation overlay - flip Y axis to match screen coordinates */}
      {isAnimating && showAnimation && (
        <div className="absolute inset-0" style={{ transform: 'scale(1, -1)' }}>
          <StrokeAnimation
            strokes={character.strokes}
            onComplete={() => setShowAnimation(false)}
          />
        </div>
      )}
    </div>
  );
}