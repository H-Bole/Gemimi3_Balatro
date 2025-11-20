
import React, { useEffect, useState } from 'react';
import { CardData, TriggerState } from '../types';
import { SUIT_COLORS, SUIT_ICONS } from '../constants';

interface CardProps {
  card: CardData;
  index?: number;
  selected: boolean;
  highlighted?: boolean; // 用于塔罗牌选择目标时的高亮
  isActive?: boolean;    // 用于计分时的高亮 (Glow)
  triggerState?: TriggerState | null; // 触发反馈
  onClick: () => void;
  onDrop?: (dragIndex: number, dropIndex: number) => void;
  disabled?: boolean;
}

// 将数字 Rank 转换为显示字符
const getRankDisplay = (rank: number) => {
  if (rank <= 10) return rank.toString();
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return '?';
};

export const CardComponent: React.FC<CardProps> = ({ card, index, selected, highlighted, isActive, triggerState, onClick, onDrop, disabled }) => {
  const colorClass = card.isDebuffed ? 'text-gray-500' : SUIT_COLORS[card.suit];
  const rankDisplay = getRankDisplay(card.rank);
  const icon = SUIT_ICONS[card.suit];
  const [animStyle, setAnimStyle] = useState<React.CSSProperties>({});
  const [triggerAnim, setTriggerAnim] = useState<string | null>(null);

  // 动画状态机处理
  useEffect(() => {
    // 只有在发牌、弃牌、计分等特殊状态下才应用内联 transform
    // 在 idle 状态下，我们让 CSS class (.selected / :hover) 来控制位移
    
    if (card.animationState === 'dealing') {
       setAnimStyle({ 
           transform: 'translateY(100vh) rotate(0deg)', 
           opacity: 0,
           transition: 'none'
       });
       requestAnimationFrame(() => {
           setTimeout(() => {
               setAnimStyle({
                   // 恢复默认位置，清除内联 transform，让 CSS 接管
                   transform: undefined, 
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
        // 计分时的特殊位移
        setAnimStyle({
            transform: isActive ? 'translateY(-60px) scale(1.15)' : 'translateY(-50px) scale(1.1)',
            zIndex: isActive ? 200 : 100,
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });
    } else if (card.animationState === 'destroyed') {
        setAnimStyle({
            transform: 'scale(0)',
            opacity: 0,
            transition: 'all 0.3s ease-in'
        });
    } else {
        // idle 状态：清空 transform，让 CSS 类 (.selected) 决定位置
        setAnimStyle({});
    }
  }, [card.animationState, card.animationDelay, isActive]);

  // 触发动画监测
  useEffect(() => {
      if (triggerState && triggerState.id === card.id) {
          setTriggerAnim(triggerState.text);
          const timer = setTimeout(() => setTriggerAnim(null), 800);
          return () => clearTimeout(timer);
      }
  }, [triggerState, card.id]);

  // 计算特效类名
  const editionClass = card.edition ? `edition-${card.edition.toLowerCase()}` : '';
  const enhanceClass = card.enhancement ? `enhance-${card.enhancement.toLowerCase()}` : '';
  const activeClass = isActive ? 'active-glow' : '';

  // 拖拽事件处理
  const handleDragStart = (e: React.DragEvent) => {
      if (disabled || index === undefined) {
          e.preventDefault();
          return;
      }
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
      e.dataTransfer.setData('type', 'card');
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const dragType = e.dataTransfer.getData('type');
      if (dragType !== 'card') return;

      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
      if (index !== undefined && !isNaN(dragIndex) && dragIndex !== index && onDrop) {
          onDrop(dragIndex, index);
      }
  };

  return (
    <div 
      className={`
        card-wrapper relative w-24 h-36 cursor-pointer select-none
        ${selected && card.animationState === 'idle' ? 'selected' : ''}
        ${highlighted ? 'ring-4 ring-yellow-400 transform -translate-y-4' : ''}
        ${disabled ? 'cursor-not-allowed opacity-80' : ''}
      `}
      style={animStyle}
      draggable={!disabled}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={!disabled ? onClick : undefined}
    >
      {/* 触发反馈浮动文字 */}
      {triggerAnim && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-[200] animate-bounce whitespace-nowrap pointer-events-none">
              <div className="bg-black/90 text-white text-xl font-black px-3 py-1 rounded border-2 border-white shadow-[4px_4px_0_#000]">
                  {triggerAnim}
              </div>
          </div>
      )}

      {/* 卡牌阴影 */}
      <div className="absolute top-2 left-2 w-full h-full bg-black/50 rounded-lg pointer-events-none"></div>

      <div className={`
        relative w-full h-full rounded-lg
        flex flex-col justify-between p-2 transition-colors overflow-hidden
        ${card.isDebuffed ? 'bg-gray-400' : 'bg-[#e0e0e0]'}
        ${selected && card.animationState === 'idle' ? 'bg-white' : 'hover:bg-gray-100'}
        ${editionClass}
        ${enhanceClass}
        ${activeClass}
      `}
      style={{
        boxShadow: 'inset -4px -4px 0px rgba(0,0,0,0.2), inset 2px 2px 0px rgba(255,255,255,0.8), 0 0 0 2px black'
      }}
      >
        {/* 削弱遮罩 */}
        {card.isDebuffed && (
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <span className="text-6xl font-bold text-red-600 opacity-60 rotate-45">❌</span>
            </div>
        )}
        
        {/* 增强效果角标 */}
        {card.enhancement === 'Bonus' && <div className="absolute top-1 right-1 text-[10px] font-bold bg-blue-500 text-white px-1 rounded shadow z-20">+30</div>}
        {card.enhancement === 'Mult' && <div className="absolute top-1 right-1 text-[10px] font-bold bg-red-500 text-white px-1 rounded shadow z-20">+4 M</div>}
        {card.edition === 'Foil' && <div className="absolute top-6 right-1 text-[8px] font-bold bg-blue-800 text-white px-1 rounded z-20 opacity-80">FOIL</div>}
        
        {/* 蜡戳 (Seals) */}
        {card.seal && (
            <div className={`absolute bottom-8 right-2 w-6 h-6 rounded-full border-2 border-white shadow-md z-20 flex items-center justify-center font-bold text-[10px]
                ${card.seal === 'Red' ? 'bg-red-600 text-white' : 
                  card.seal === 'Blue' ? 'bg-blue-600 text-white' : 
                  card.seal === 'Gold' ? 'bg-yellow-500 text-black' : 
                  'bg-purple-600 text-white'
                }
            `}>
                {card.seal === 'Red' ? 'R' : card.seal === 'Blue' ? 'B' : card.seal === 'Gold' ? '$' : 'P'}
            </div>
        )}

        {/* 左上角点数 */}
        <div className={`text-2xl font-bold leading-none flex flex-col items-center ${colorClass} drop-shadow-sm z-10`}>
          <span style={{fontFamily: 'VT323'}}>{rankDisplay}</span>
          <span className="text-lg">{icon}</span>
        </div>

        {/* 中央大花色 */}
        <div className={`absolute inset-0 flex items-center justify-center ${colorClass}`}>
          <div className={`border-2 border-current rounded-full p-2 opacity-100 ${card.isDebuffed ? 'bg-gray-500' : 'bg-white/50'} backdrop-blur-sm shadow-inner`}>
             <span className="text-5xl filter drop-shadow-md">{icon}</span>
          </div>
        </div>

        {/* 右下角点数 (倒置) */}
        <div className={`text-2xl font-bold leading-none flex flex-col items-center transform rotate-180 ${colorClass} drop-shadow-sm z-10`}>
          <span style={{fontFamily: 'VT323'}}>{rankDisplay}</span>
          <span className="text-lg">{icon}</span>
        </div>
        
        {/* 装饰线 */}
        <div className="absolute inset-1 border-2 border-dashed border-gray-400/50 pointer-events-none opacity-50 rounded-lg"></div>
      </div>
    </div>
  );
};
