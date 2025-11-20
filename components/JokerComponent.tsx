
import React, { useEffect, useState } from 'react';
import { Joker, TriggerState } from '../types';
import { t, Language } from '../i18n';

interface JokerProps {
  joker: Joker;
  index?: number;
  canSell?: boolean;
  onSell?: () => void;
  price?: number;
  onClick?: () => void;
  onDrop?: (dragIndex: number, dropIndex: number) => void;
  triggerState?: TriggerState | null;
  isActive?: boolean; // 是否正在计分
  language?: Language;
}

const RARITY_STYLES = {
  'Common': 'bg-[#009ddc] border-[#005f85]', // Blue
  'Uncommon': 'bg-[#44bd32] border-[#276e1d]', // Green
  'Rare': 'bg-[#f0932b] border-[#b36816]', // Orange
  'Legendary': 'bg-[#9c88ff] border-[#604cab]', // Purple
};

export const JokerComponent: React.FC<JokerProps> = ({ joker, index, canSell, onSell, price, onClick, onDrop, triggerState, isActive, language = 'ZH' }) => {
  const baseStyle = RARITY_STYLES[joker.rarity];
  
  // 使用 i18n key 获取名称和描述
  const name = t(language, `joker_name_${joker.rawId}`);
  const desc = t(language, `joker_desc_${joker.rawId}`);
  const rarityLabel = t(language, `rarity_${joker.rarity}`);

  const [triggerAnim, setTriggerAnim] = useState<string | null>(null);

  // 触发动画监测
  useEffect(() => {
      if (triggerState && triggerState.id === joker.id) {
          setTriggerAnim(triggerState.text);
          const timer = setTimeout(() => setTriggerAnim(null), 800);
          return () => clearTimeout(timer);
      }
  }, [triggerState, joker.id]);

  // 版本特效类
  const editionClass = joker.edition ? `edition-${joker.edition.toLowerCase()}` : '';
  const editionLabel = joker.edition ? t(language, `edition_${joker.edition}`) : '';
  const activeClass = isActive ? 'active-glow scale-110 z-50' : '';

  const handleDragStart = (e: React.DragEvent) => {
      if (index === undefined) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.setData('type', 'joker');
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const dragType = e.dataTransfer.getData('type');
      if (dragType !== 'joker') return;

      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (index !== undefined && !isNaN(dragIndex) && dragIndex !== index && onDrop) {
          onDrop(dragIndex, index);
      }
  };

  return (
    <div 
      className={`
        relative w-24 h-36 md:w-32 md:h-48 flex flex-col items-center justify-between
        transition-all hover:scale-105 cursor-pointer
        ${baseStyle}
        ${editionClass}
        ${activeClass}
      `}
      style={{
        boxShadow: isActive ? '0 0 20px rgba(255,255,255,0.8)' : 'inset 2px 2px 0 rgba(255,255,255,0.4), inset -2px -2px 0 rgba(0,0,0,0.3), 4px 4px 0px rgba(0,0,0,0.5)',
        borderWidth: '3px',
        borderStyle: 'solid'
      }}
      onClick={onClick}
      draggable={index !== undefined}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 触发反馈 */}
      {triggerAnim && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-[200] animate-bounce whitespace-nowrap pointer-events-none">
              <div className="bg-black/90 text-white text-lg md:text-xl font-black px-3 py-1 rounded-lg border-2 border-white shadow-[4px_4px_0_#000]">
                  {triggerAnim}
              </div>
          </div>
      )}

      {/* 名字横幅 */}
      <div className="w-full bg-black/40 text-white text-[10px] md:text-[12px] text-center py-1 font-bold uppercase tracking-wider border-b border-white/20 truncate px-2 mt-0 z-10 relative">
        {name}
      </div>

      {/* 艺术插图区域 */}
      <div className="flex-1 flex items-center justify-center w-full px-2 z-10 relative">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-white border-2 border-black shadow-inner flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlZWUiLz4KPC9zdmc+')] opacity-20"></div>
            <div className="text-3xl md:text-5xl z-10 filter drop-shadow-lg">🤡</div>
        </div>
      </div>

      {/* 描述框 */}
      <div className="w-full px-2 pb-2 z-10 relative">
        <div className="w-full bg-white text-black border-2 border-black p-1 text-center relative flex items-center justify-center min-h-[40px] md:min-h-[60px]">
             <p className="text-[8px] md:text-[10px] font-bold leading-tight">{desc}</p>
        </div>
      </div>

      {/* 价格标签 */}
      {price !== undefined && (
         <div className="absolute -top-3 -right-3 bg-yellow-400 text-black font-black px-2 py-1 text-sm md:text-lg border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,0.5)] z-30 transform rotate-[5deg]">
           ${price}
         </div>
      )}

      {/* 出售按钮 */}
      {canSell && (
        <button 
            className="absolute -top-3 -right-3 bg-red-600 text-white w-6 h-6 md:w-8 md:h-8 flex items-center justify-center font-bold border-2 border-black hover:bg-red-500 z-30 shadow-md text-xs md:text-sm hover:scale-110 transition-transform"
            onClick={(e) => {
                e.stopPropagation();
                onSell && onSell();
            }}
        >
            $
        </button>
      )}
      
      {/* 稀有度/版本徽章 */}
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-black text-white text-[8px] md:text-[9px] px-2 py-0.5 border border-white/50 rounded-full uppercase tracking-widest z-20 whitespace-nowrap">
        {joker.edition ? `${editionLabel} ` : ''}{rarityLabel}
      </div>
    </div>
  );
};
