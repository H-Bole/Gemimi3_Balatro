
import React, { useEffect, useState } from 'react';
import { CardData } from '../types';
import { SUIT_COLORS, SUIT_ICONS } from '../constants';

interface CardProps {
  card: CardData;
  index?: number;
  selected: boolean;
  highlighted?: boolean; // New prop for selection mode
  onClick: () => void;
  onDrop?: (dragIndex: number, dropIndex: number) => void;
  disabled?: boolean;
}

const getRankDisplay = (rank: number) => {
  if (rank <= 10) return rank.toString();
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return '?';
};

export const CardComponent: React.FC<CardProps> = ({ card, index, selected, highlighted, onClick, onDrop, disabled }) => {
  const colorClass = card.isDebuffed ? 'text-gray-500' : SUIT_COLORS[card.suit];
  const rankDisplay = getRankDisplay(card.rank);
  const icon = SUIT_ICONS[card.suit];
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});

  // Calculate animation style based on state
  useEffect(() => {
    if (card.animationState === 'dealing') {
       setAnimStyle({ 
           transform: 'translateY(100vh) rotate(0deg)', 
           opacity: 0,
           transition: 'none'
       });
       requestAnimationFrame(() => {
           setTimeout(() => {
               setAnimStyle({
                   transform: 'translateY(0) rotate(0deg)',
                   opacity: 1,
                   transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
               });
           }, card.animationDelay || 0);
       });
    } else if (card.animationState === 'discarding') {
        setAnimStyle({
            transform: 'translateY(200px) rotate(10deg) scale(0.8)',
            opacity: 0,
            transition: 'all 0.4s ease-in',
            zIndex: 0
        });
    } else if (card.animationState === 'scoring') {
        setAnimStyle({
            transform: 'translateY(-150px) scale(1.1)',
            zIndex: 100,
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });
    } else {
        setAnimStyle({});
    }
  }, [card.animationState, card.animationDelay]);

  // Styling for Editions and Enhancements
  const editionClass = card.edition ? `edition-${card.edition.toLowerCase()}` : '';
  const enhanceClass = card.enhancement ? `enhance-${card.enhancement.toLowerCase()}` : '';

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent) => {
      if (disabled || index === undefined) {
          e.preventDefault();
          return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (index !== undefined && !isNaN(dragIndex) && dragIndex !== index && onDrop) {
          onDrop(dragIndex, index);
      }
  };

  return (
    <div 
      className={`
        card-wrapper relative w-24 h-36 cursor-pointer
        ${selected && card.animationState === 'idle' ? 'selected' : ''}
        ${highlighted ? 'ring-4 ring-yellow-400 transform -translate-y-4' : ''}
        ${disabled ? 'cursor-not-allowed' : ''}
      `}
      style={animStyle}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={!disabled ? onClick : undefined}
    >
      {/* Card Shadow */}
      <div className="absolute top-2 left-2 w-full h-full bg-black/50 rounded-lg pointer-events-none"></div>

      <div className={`
        relative w-full h-full
        flex flex-col justify-between p-2 select-none transition-colors overflow-hidden
        ${card.isDebuffed ? 'bg-gray-400' : 'bg-[#e0e0e0]'}
        ${selected && card.animationState === 'idle' ? 'bg-white translate-y-[-10px]' : 'hover:bg-gray-100'}
        ${disabled ? 'opacity-90' : ''}
        ${editionClass}
        ${enhanceClass}
      `}
      style={{
        boxShadow: 'inset -4px -4px 0px rgba(0,0,0,0.2), inset 2px 2px 0px rgba(255,255,255,0.8), 0 0 0 2px black'
      }}
      >
        {/* Debuff Overlay */}
        {card.isDebuffed && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <span className="text-6xl font-bold text-red-600 opacity-60 rotate-45">❌</span>
            </div>
        )}
        
        {/* Enhancement Stickers */}
        {card.enhancement === 'Bonus' && <div className="absolute top-1 right-1 text-[10px] font-bold bg-blue-500 text-white px-1 rounded shadow">+30</div>}
        {card.enhancement === 'Mult' && <div className="absolute top-1 right-1 text-[10px] font-bold bg-red-500 text-white px-1 rounded shadow">+4 M</div>}
        {card.enhancement === 'Glass' && <div className="absolute inset-0 bg-white/20 pointer-events-none backdrop-blur-[1px] border-2 border-white/40"></div>}

        {/* Top Left */}
        <div className={`text-2xl font-bold leading-none flex flex-col items-center ${colorClass} drop-shadow-sm z-10`}>
          <span style={{fontFamily: 'VT323'}}>{rankDisplay}</span>
          <span className="text-lg">{icon}</span>
        </div>

        {/* Center Big Icon */}
        <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
          <div className={`border-2 border-current rounded-full p-2 opacity-100 ${card.isDebuffed ? 'bg-gray-500' : 'bg-white/50'} backdrop-blur-sm shadow-inner`}>
             <span className="text-5xl filter drop-shadow-md">{icon}</span>
          </div>
        </div>

        {/* Bottom Right (Inverted) */}
        <div className={`text-2xl font-bold leading-none flex flex-col items-center transform rotate-180 ${colorClass} drop-shadow-sm z-10`}>
          <span style={{fontFamily: 'VT323'}}>{rankDisplay}</span>
          <span className="text-lg">{icon}</span>
        </div>
        
        {/* High Contrast Inner Border */}
        <div className="absolute inset-1 border-2 border-dashed border-gray-400/50 pointer-events-none opacity-50"></div>
      </div>
    </div>
  );
};
