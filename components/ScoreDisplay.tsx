import React, { useEffect, useState } from 'react';
import { TriggerState } from '../types';

interface ScoreDisplayProps {
    label: string;
    chips: number;
    mult: number;
    total: number;
    triggerState?: TriggerState | null; // 用于触发跳动动画
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ label, chips, mult, total, triggerState }) => {
    const [pulseChips, setPulseChips] = useState(false);
    const [pulseMult, setPulseMult] = useState(false);

    // 监听数值变化以触发动画
    useEffect(() => {
        if (triggerState?.type === 'chips') {
            setPulseChips(true);
            setTimeout(() => setPulseChips(false), 150);
        }
        if (triggerState?.type === 'mult' || triggerState?.type === 'x_mult') {
            setPulseMult(true);
            setTimeout(() => setPulseMult(false), 150);
        }
    }, [chips, mult, triggerState]);

    // 是否显示火焰特效 (当倍率很高时)
    const isFireMult = mult >= 20; 

    return (
        <div className="absolute top-24 z-[200] flex flex-col items-center w-full pointer-events-none animate-score-enter">
            <div className="bg-[#222] border-4 border-white p-6 rounded-xl shadow-[0_0_0_4px_rgba(0,0,0,0.5)] text-center min-w-[340px] relative overflow-hidden">
                
                {/* 背景光效 */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/40 z-0"></div>

                <div className="relative z-10">
                    <div className="text-2xl text-gray-300 uppercase mb-4 font-bold tracking-widest border-b-2 border-gray-600 pb-2 flex justify-between items-center">
                        <span>{label}</span>
                    </div>
                    
                    <div className="flex items-center justify-center gap-6 text-5xl font-black mb-4">
                        {/* 筹码 (Chips) */}
                        <div className={`
                            bg-[#009ddc] px-4 py-2 rounded-lg border-2 border-white/30 shadow-inner text-white
                            transition-transform duration-100
                            ${pulseChips ? 'scale-110 brightness-125' : 'scale-100'}
                        `}>
                            {Math.floor(chips).toLocaleString()}
                        </div>
                        
                        <span className="text-white text-3xl font-bold">X</span>
                        
                        {/* 倍率 (Mult) */}
                        <div className={`
                            bg-[#FE5F55] px-4 py-2 rounded-lg border-2 border-white/30 shadow-inner text-white
                            transition-transform duration-100
                            ${pulseMult ? 'scale-110 brightness-125' : 'scale-100'}
                            ${isFireMult ? 'text-fire bg-red-700 border-yellow-400' : ''}
                        `}>
                            {Math.floor(mult).toLocaleString()}
                        </div>
                    </div>
                    
                    <div className="w-full h-1 bg-gray-600 my-4"></div>
                    
                    {/* 总分预览 */}
                    <div className="text-6xl font-black text-white drop-shadow-[4px_4px_0_#000] tabular-nums tracking-tighter">
                        {total > 0 ? total.toLocaleString() : (Math.floor(chips) * Math.floor(mult)).toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};
