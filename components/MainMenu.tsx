
import React from 'react';
import { t, Language } from '../i18n';

interface Props {
    onStart: () => void;
    onSettings: () => void;
    onRules: () => void;
    language: Language;
}

export const MainMenu: React.FC<Props> = ({ onStart, onSettings, onRules, language }) => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50">
            <div className="z-10 text-center transform scale-110 flex flex-col items-center">
                {/* 标题 Title */}
                <h1 className="text-9xl mb-2 text-[#FE5F55] animate-pulse text-shadow-retro font-black tracking-tighter" style={{fontFamily: 'VT323'}}>
                    BALATRO
                </h1>
                
                {/* 副标题/作者信息 Subtitle */}
                <div className="text-2xl mb-12 text-blue-300 text-shadow-retro tracking-widest bg-black/40 px-6 py-2 rounded-full border border-blue-500/30 backdrop-blur-sm">
                    Product by Gemini 3 <span className="text-yellow-400 font-bold">@H-Bole</span>
                </div>
                
                {/* 按钮组 Button Group */}
                <div className="flex flex-col gap-4 w-72">
                    <button 
                        onClick={onStart} 
                        className="w-full py-5 bg-orange-500 text-white text-4xl font-bold rounded shadow-[6px_6px_0_#000] hover:translate-y-1 hover:shadow-[3px_3px_0_#000] transition-all border-4 border-black group relative overflow-hidden"
                    >
                        <span className="relative z-10 drop-shadow-md">{t(language, 'start_game')}</span>
                        {/* 按钮光效扫过动画 */}
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12"></div>
                    </button>
                    
                    <div className="flex gap-4 mt-2">
                        <button 
                            onClick={onRules} 
                            className="flex-1 py-3 bg-red-600 rounded border-2 border-black hover:bg-red-500 text-white font-bold shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-y-1 transition-all text-lg"
                        >
                             📖 {t(language, 'rules')}
                        </button>
                        <button 
                            onClick={onSettings} 
                            className="flex-1 py-3 bg-gray-600 rounded border-2 border-black hover:bg-gray-500 text-white font-bold shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-y-1 transition-all text-lg"
                        >
                             ⚙️ {t(language, 'settings')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
