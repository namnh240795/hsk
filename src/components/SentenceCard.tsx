import { useEffect, useCallback, useState } from 'react';
import { Sentence } from '../data/sentences';

interface SentenceCardProps {
  sentence: Sentence;
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

function speakPinyin(pinyin: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(pinyin);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance);
  }
}

function speakSentence(sentence: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.5;
    window.speechSynthesis.speak(utterance);
  }
}

export default function SentenceCard({
  sentence,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
}: SentenceCardProps) {
  const [showPinyin, setShowPinyin] = useState(true);
  const [showEnglish, setShowEnglish] = useState(true);
  const [showVietnamese, setShowVietnamese] = useState(true);

  useEffect(() => {
    speakSentence(sentence.chinese);
  }, [sentence.chinese]);

  const handleSpeakPinyin = useCallback(() => {
    speakPinyin(sentence.pinyin);
  }, [sentence.pinyin]);

  const handleSpeakChinese = useCallback(() => {
    speakSentence(sentence.chinese);
  }, [sentence.chinese]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl mx-auto">
      {/* Progress */}
      <div className="text-center mb-6">
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {totalCount}
        </span>
      </div>

      {/* Chinese sentence */}
      <div className="text-center mb-4">
        <button
          onClick={handleSpeakChinese}
          className="text-4xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
        >
          {sentence.chinese}
        </button>
      </div>

      {/* Pinyin */}
      {showPinyin && (
        <div className="text-center mb-4">
          <button
            onClick={handleSpeakPinyin}
            className="text-xl text-blue-600 hover:text-blue-800 transition-colors"
          >
            {sentence.pinyin}
          </button>
        </div>
      )}

      {/* English meaning */}
      {showEnglish && (
        <div className="text-center">
          <span className="text-lg text-gray-600 italic">
            {sentence.english}
          </span>
        </div>
      )}

      {/* Vietnamese meaning */}
      {showVietnamese && (
        <div className="text-center mt-2">
          <span className="text-lg text-green-600 italic">
            {sentence.vietnamese}
          </span>
        </div>
      )}

      {/* Toggle buttons */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => setShowPinyin(!showPinyin)}
          className={`px-3 py-1 rounded-full text-sm ${
            showPinyin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pinyin
        </button>
        <button
          onClick={() => setShowEnglish(!showEnglish)}
          className={`px-3 py-1 rounded-full text-sm ${
            showEnglish ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setShowVietnamese(!showVietnamese)}
          className={`px-3 py-1 rounded-full text-sm ${
            showVietnamese ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Tiếng Việt
        </button>
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
          onClick={handleSpeakChinese}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Play Audio
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