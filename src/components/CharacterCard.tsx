import { useEffect, useCallback } from 'react';
import StrokeAnimation from './StrokeAnimation';
import { CharacterData } from '../types/character';

interface CharacterCardProps {
  character: CharacterData;
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
  onReplay: () => void;
  onGoToPage: (page: number) => void;
  isAnimating: boolean;
}

function playPinyin(pinyin: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pinyin);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
  }
}

export default function CharacterCard({
  character,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  onReplay,
  onGoToPage,
  isAnimating,
}: CharacterCardProps) {
  useEffect(() => {
    playPinyin(character.pinyin);
  }, [character.pinyin]);

  const handleReplay = useCallback(() => {
    playPinyin(character.pinyin);
    onReplay();
  }, [character.pinyin, onReplay]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="text-center mb-6 flex items-center justify-center gap-2">
        <input
          type="number"
          min="1"
          max={totalCount}
          value={currentIndex + 1}
          onChange={(e) => {
            const page = parseInt(e.target.value, 10);
            if (page >= 1 && page <= totalCount) {
              onGoToPage(page - 1);
            }
          }}
          className="w-16 px-2 py-1 text-center border border-gray-300 rounded-lg text-sm"
        />
        <span className="text-sm text-gray-500">/ {totalCount}</span>
      </div>

      {/* Main content: character on left, stroke animation on right */}
      <div className="flex gap-8 items-center justify-center">
        {/* Character (left side) */}
        <div className="flex-shrink-0 w-40 h-40 flex items-center justify-center bg-gray-50 rounded-xl">
          <span className="text-8xl font-bold text-gray-900">
            {character.character}
          </span>
        </div>

        {/* Stroke animation (right side) */}
        <div className="flex-shrink-0 w-40 h-40 relative">
          {isAnimating && (
            <div className="absolute inset-0" style={{ transform: 'scale(1, -1)' }}>
              <StrokeAnimation
                strokes={character.strokes}
                onComplete={() => {}}
              />
            </div>
          )}
        </div>
      </div>

      {/* Pinyin */}
      <div className="text-center mt-6">
        <span className="text-3xl font-semibold text-blue-600">
          {character.pinyin}
        </span>
      </div>

      {/* Meaning */}
      <div className="text-center mt-2">
        <span className="text-xl text-gray-700">
          {character.meaning}
        </span>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <button
          onClick={handleReplay}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Replay Animation
        </button>

        <button
          onClick={onNext}
          disabled={currentIndex === totalCount - 1}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}