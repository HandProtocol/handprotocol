import React, { useEffect, useState } from 'react';
import { wheelCategories } from '../data/categories';

interface Word {
  text: string;
  speed: number;
  delay: number;
  distance: number;
  angle: number;
  opacity: number;
}

interface SpinningWordsProps {
  isSpinning: boolean;
}

export function SpinningWords({ isSpinning }: SpinningWordsProps) {
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    if (isSpinning) {
      // Create burst words array with categories and common terms
      const burstWords = [
        ...Array(4).fill({ text: '$USDGLO', type: 'burst' }),
        ...wheelCategories.map(cat => ({ text: cat.name, type: 'burst' })),
        ...Array(3).fill({ text: 'Glo Dollar', type: 'burst' }),
        ...Array(3).fill({ text: 'Giveth', type: 'burst' }),
        ...Array(5).fill({ text: 'Public Goods', type: 'stream' }),
        ...Array(4).fill({ text: 'Public Goods Funding', type: 'stream' }),
      ];

      const newWords = burstWords.map((word, index) => ({
        text: word.text,
        speed: word.type === 'burst' ? 2 + Math.random() * 3 : 1 + Math.random(),
        delay: word.type === 'burst' ? Math.random() * 1000 : index * 150,
        distance: 0,
        angle: (Math.random() * 360 * Math.PI) / 180,
        opacity: 1,
      }));

      setWords(newWords);

      const interval = setInterval(() => {
        setWords(prevWords => {
          const activeWords = prevWords
            .map(word => ({
              ...word,
              distance: word.distance + word.speed,
              opacity: Math.max(0, 1 - word.distance / 400),
            }))
            .filter(word => word.opacity > 0);

          if (activeWords.length < 10 && Math.random() < 0.1) {
            const newWord = burstWords[Math.floor(Math.random() * burstWords.length)];
            activeWords.push({
              text: newWord.text,
              speed: newWord.type === 'burst' ? 2 + Math.random() * 3 : 1 + Math.random(),
              delay: 0,
              distance: 0,
              angle: (Math.random() * 360 * Math.PI) / 180,
              opacity: 1,
            });
          }

          return activeWords;
        });
      }, 16);

      return () => {
        clearInterval(interval);
        setWords([]);
      };
    }
  }, [isSpinning]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {words.map((word, index) => {
        const x = Math.cos(word.angle) * word.distance;
        const y = Math.sin(word.angle) * word.distance;
        
        return (
          <div
            key={`${index}-${word.text}`}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              opacity: word.opacity,
              transition: 'opacity 0.2s ease-out',
              animation: `fadeIn 0.3s ease-out ${word.delay}ms backwards`,
              color: getWordColor(word.text),
              fontWeight: 'bold',
              fontSize: getWordSize(word.text),
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {word.text}
          </div>
        );
      })}
    </div>
  );
}

function getWordColor(text: string): string {
  const category = wheelCategories.find(cat => cat.name === text);
  if (category) return category.color;

  switch (text) {
    case '$USDGLO':
      return '#FFD700';
    case 'Glo Dollar':
      return '#FFA500';
    case 'Giveth':
      return '#FF69B4';
    default:
      return '#FFFFFF';
  }
}

function getWordSize(text: string): string {
  const isMobile = window.innerWidth < 768;
  const baseSize = isMobile ? 0.7 : 1;

  switch (text) {
    case '$USDGLO':
      return `${2.5 * baseSize}rem`;
    case 'Glo Dollar':
    case 'Giveth':
      return `${2 * baseSize}rem`;
    default:
      return `${1.75 * baseSize}rem`;
  }
}