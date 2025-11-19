
import React from 'react';
import { Joker } from '../types';
import { t, Language } from '../i18n';

interface JokerProps {
  joker: Joker;
  canSell?: boolean;
  onSell?: () => void;
  price?: number;
  onClick?: () => void;
  language?: Language;
}

const RARITY_STYLES = {
  'Common': 'bg-[#009ddc] border-[#005f85]', // Blue
  'Uncommon': 'bg-[#44bd32] border-[#276e1d]', // Green
  'Rare': 'bg-[#f0932b] border-[#b36816]', // Orange
  'Legendary': 'bg-[#9c88ff] border-[#604cab]', // Purple
};

export const JokerComponent: React.FC<JokerProps> = ({ joker, canSell, onSell, price, onClick, language = 'ZH' }) => {
  const baseStyle = RARITY_STYLES[joker.rarity];
  const name = (language === 'ZH' && joker.nameZh) ? joker.nameZh : joker.name;
  const desc = (language === 'ZH' && joker.descriptionZh) ? joker.descriptionZh : joker.description;
  const rarityLabel = t(language, `rarity_${joker.rarity}`);

  // Edition visuals
  const editionClass = joker.edition ? `edition-${joker.edition.toLowerCase()}` : '';
  const editionLabel = joker.edition ? t(language, `edition_${joker.edition}`) : '';

  return (
    <div 
      className={`
        relative w-32 h-48 flex flex-col items-center justify-between
        transition-transform hover:scale-105 cursor-pointer
        ${baseStyle}
        ${editionClass}
      `}
      style={{
        boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.3), 4px 4px 0px rgba(0,0,0,0.5)',
        borderWidth: '3px',
        borderStyle: 'solid'
      }}
      onClick={onClick}
    >
      {/* Name Banner */}
      <div className="w-full bg-black/40 text-white text-[12px] text-center py-1 font-bold uppercase tracking-wider border-b border-white/20 truncate px-2 mt-0 z-10 relative">
        {name}
      </div>

      {/* Art Area */}
      <div className="flex-1 flex items-center justify-center w-full px-2 z-10 relative">
        <div className="w-16 h-16 bg-white border-2 border-black shadow-inner flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWUiLz4KPC9zdmc+')] opacity-20"></div>
            <div className="text-5xl z-10 filter drop-shadow-lg">🤡</div>
        </div>
      </div>

      {/* Description Box */}
      <div className="w-full px-2 pb-2 z-10 relative">
        <div className="w-full bg-white text-black border-2 border-black p-1 text-center relative flex items-center justify-center min-h-[60px]">
             <p className="text-[10px] font-bold leading-tight">{desc}</p>
        </div>
      </div>

      {/* Price Tag */}
      {price !== undefined && (
         <div className="absolute -top-3 -right-3 bg-yellow-400 text-black font-black px-2 py-1 text-lg border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.5)] z-30 transform rotate-[5deg]">
           ${price}
         </div>
      )}

      {/* Sell Button */}
      {canSell && (
        <button 
            className="absolute -top-3 -right-3 bg-red-600 text-white w-8 h-8 flex items-center justify-center font-bold border-2 border-black hover:bg-red-500 z-30 shadow-md text-sm hover:scale-110 transition-transform"
            onClick={(e) => {
                e.stopPropagation();
                onSell && onSell();
            }}
        >
            $
        </button>
      )}
      
      {/* Rarity Badge */}
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-white text-[9px] px-2 py-0.5 border border-white/50 rounded-full uppercase tracking-widest z-20 whitespace-nowrap">
        {joker.edition ? `${joker.edition} ` : ''}{rarityLabel}
      </div>
    </div>
  );
};
