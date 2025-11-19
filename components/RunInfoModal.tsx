import React from 'react';
import { HAND_SCALING } from '../constants';
import { HandType } from '../types';
import { t, Language } from '../i18n';

interface Props {
  onClose: () => void;
  language?: Language;
}

export const RunInfoModal: React.FC<Props> = ({ onClose, language = 'ZH' }) => {
  const hands = Object.values(HandType);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[600px] max-h-[80vh] bg-[#2c3e50] border-4 border-white shadow-[10px_10px_0_#000] flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-red-600 text-white p-4 border-b-4 border-black flex justify-between items-center">
             <h2 className="text-3xl font-black uppercase tracking-widest text-shadow-retro">{t(language, 'rules')}</h2>
             <button onClick={onClose} className="text-2xl font-bold hover:text-gray-200">X</button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-gray-400 text-sm uppercase font-bold mb-2 px-2">
                    <div className="col-span-5">{t(language, 'hand')}</div>
                    <div className="col-span-3 text-center">{t(language, 'chips')}</div>
                    <div className="col-span-1 text-center">X</div>
                    <div className="col-span-3 text-center">{t(language, 'mult')}</div>
                </div>
                {hands.map((hand) => {
                    const stats = HAND_SCALING[hand];
                    const label = language === 'ZH' ? stats.labelZh : stats.label;
                    const desc = language === 'ZH' ? stats.descriptionZh : stats.description;
                    
                    return (
                        <div key={hand} className="grid grid-cols-12 gap-2 items-center bg-black/30 p-3 rounded border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="col-span-5">
                                <div className="font-bold text-lg text-white">{label}</div>
                                <div className="text-xs text-gray-400">{desc}</div>
                            </div>
                            <div className="col-span-3 text-center font-black text-2xl text-[#009ddc] drop-shadow-sm">
                                {stats.baseChips}
                            </div>
                            <div className="col-span-1 text-center text-gray-500 font-bold">X</div>
                            <div className="col-span-3 text-center font-black text-2xl text-[#FE5F55] drop-shadow-sm">
                                {stats.baseMult}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="p-4 border-t-4 border-black bg-[#222]">
             <button 
                onClick={onClose}
                className="w-full py-3 bg-gray-600 text-white font-bold text-xl rounded border-2 border-black hover:bg-gray-500"
            >
                {t(language, 'close')}
            </button>
        </div>
      </div>
    </div>
  );
};