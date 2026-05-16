import { useState, useCallback } from 'react';
import CharacterCard from './components/CharacterCard';
import SentenceCard from './components/SentenceCard';
import { lesson1Characters } from './data/lesson1';
import { sentences } from './data/sentences';

type Tab = 'characters' | 'sentences';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('characters');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animatingKey, setAnimatingKey] = useState(0);

  const currentCharacter = lesson1Characters[currentIndex];
  const currentSentence = sentences[currentIndex];

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setAnimatingKey((prev) => prev + 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    const maxIndex = activeTab === 'characters' ? lesson1Characters.length - 1 : sentences.length - 1;
    if (currentIndex < maxIndex) {
      setCurrentIndex((prev) => prev + 1);
      setAnimatingKey((prev) => prev + 1);
    }
  }, [currentIndex, activeTab]);

  const replayAnimation = useCallback(() => {
    setAnimatingKey((prev) => prev + 1);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setCurrentIndex(0);
    setAnimatingKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 flex flex-col items-center p-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow-lg">
        <button
          onClick={() => handleTabChange('characters')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'characters'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Characters
        </button>
        <button
          onClick={() => handleTabChange('sentences')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'sentences'
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Sentences
        </button>
      </div>

      {/* Content */}
      {activeTab === 'characters' ? (
        <CharacterCard
          key={`char-${animatingKey}`}
          character={currentCharacter}
          currentIndex={currentIndex}
          totalCount={lesson1Characters.length}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onReplay={replayAnimation}
          isAnimating={true}
        />
      ) : (
        <SentenceCard
          key={`sent-${animatingKey}`}
          sentence={currentSentence}
          currentIndex={currentIndex}
          totalCount={sentences.length}
          onPrevious={goToPrevious}
          onNext={goToNext}
        />
      )}
    </div>
  );
}