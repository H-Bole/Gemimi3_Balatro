
import React from 'react';
import { Consumable } from '../types';
import { t, Language } from '../i18n';

interface Props {
  item: Consumable;
  onClick?: () => void;
  canBuy?: boolean;
  price?: number;
  language?: Language;
}

export const ConsumableComponent: React.FC<Props> = ({ item, onClick, canBuy, price, language = 'ZH' }) => {
  const name = (language === 'ZH' && item.nameZh) ? item.nameZh : item.name;
  const desc = (language === 'ZH' && item.descriptionZh) ? item.descriptionZh : item.description;
  const typeLabel = t(language, `type_${item.type}`);
  
  const bgClass = item.type === 'Planet' ? 'bg-blue-600 border-blue-800' : 'bg-purple-600 border-purple-800';

  return (
    <div 
      className={`relative w-24 h-36 flex flex-col items-center p-1 cursor-pointer hover:scale-105 transition-transform border-2 ${bgClass}`}
      onClick={onClick}
      style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
    >
      {/* Title */}
      <div className="w-full text-center text-[10px] font-bold text-white uppercase tracking-tighter leading-none mb-1 bg-black/20 py-1 truncate">
         {name}
      </div>
      
      {/* Art Placeholder */}
      <div className="flex-1 w-full bg-black/20 flex items-center justify-center mb-1">
          <span className="text-3xl">{item.type === 'Planet' ? '🪐' : '🔮'}</span>
      </div>
      
      {/* Desc */}
      <div className="w-full bg-white p-1 text-center border border-black min-h-[40px] flex items-center justify-center">
          <p className="text-[8px] leading-tight font-bold text-black">{desc}</p>
      </div>
      
      {/* Type Badge */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-[8px] px-2 rounded-full border border-white whitespace-nowrap">
         {typeLabel}
      </div>

      {/* Price Tag */}
      {canBuy && price !== undefined && (
         <div className="absolute -top-2 -right-2 bg-yellow-400 text-black font-black px-1 text-sm border border-black shadow-sm z-10">
           ${price}
         </div>
      )}
    </div>
  );
};
