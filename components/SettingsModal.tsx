
import React from 'react';
import { GameSettings } from '../types';
import { audio } from '../services/audio';
import { t } from '../i18n';

interface Props {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onClose: () => void;
  onGiveUp?: () => void; // 新增回调：放弃游戏
  isInGame?: boolean;    // 状态：是否在游戏中
}

export const SettingsModal: React.FC<Props> = ({ settings, onUpdate, onClose, onGiveUp, isInGame }) => {
  const lang = settings.language;

  const handleChange = (key: keyof GameSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    onUpdate(newSettings);
    if (key === 'volume') {
        audio.setVolume(value);
    }
    if (key === 'bgmVolume') {
        audio.setMusicVolume(value);
    }
    audio.playClick();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-[500px] bg-[#2c3e50] border-4 border-white shadow-[10px_10px_0_#000] p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-4xl font-bold text-white mb-8 text-center text-shadow-retro tracking-widest uppercase">
            {t(lang, 'settings')}
        </h2>
        
        <div className="space-y-6">
            {/* 语言选择 */}
            <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-blue-300">{t(lang, 'language')}</span>
                <div className="flex border-2 border-black bg-black">
                    <button 
                        onClick={() => handleChange('language', 'ZH')}
                        className={`px-4 py-1 font-bold ${settings.language === 'ZH' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                    >中文</button>
                    <button 
                        onClick={() => handleChange('language', 'EN')}
                        className={`px-4 py-1 font-bold ${settings.language === 'EN' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'}`}
                    >EN</button>
                </div>
            </div>

            {/* 主音量控制 */}
            <div>
                <div className="flex justify-between text-xl font-bold text-orange-400 mb-2">
                    <span>{t(lang, 'master_volume')}</span>
                    <span>{Math.round(settings.volume * 100)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.1" 
                    value={settings.volume}
                    onChange={(e) => handleChange('volume', parseFloat(e.target.value))}
                    className="w-full h-4 bg-black rounded-lg appearance-none cursor-pointer border-2 border-gray-600"
                />
            </div>

            {/* 音乐音量控制 */}
            <div>
                <div className="flex justify-between text-xl font-bold text-blue-400 mb-2">
                    <span>{t(lang, 'music_volume')}</span>
                    <span>{Math.round(settings.bgmVolume * 100)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0" max="1" step="0.1" 
                    value={settings.bgmVolume}
                    onChange={(e) => handleChange('bgmVolume', parseFloat(e.target.value))}
                    className="w-full h-4 bg-black rounded-lg appearance-none cursor-pointer border-2 border-gray-600"
                />
            </div>

            {/* 开关 CRT */}
            <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-blue-300">{t(lang, 'crt_effects')}</span>
                <button 
                    onClick={() => handleChange('enableCrt', !settings.enableCrt)}
                    className={`w-16 h-8 border-2 border-black flex items-center px-1 transition-all ${settings.enableCrt ? 'bg-green-500 justify-end' : 'bg-gray-600 justify-start'}`}
                >
                    <div className="w-6 h-6 bg-white border border-black shadow-sm"></div>
                </button>
            </div>

            {/* 开关背景动画 */}
            <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-blue-300">{t(lang, 'motion')}</span>
                <button 
                    onClick={() => handleChange('enableMotion', !settings.enableMotion)}
                    className={`w-16 h-8 border-2 border-black flex items-center px-1 transition-all ${settings.enableMotion ? 'bg-green-500 justify-end' : 'bg-gray-600 justify-start'}`}
                >
                    <div className="w-6 h-6 bg-white border border-black shadow-sm"></div>
                </button>
            </div>
        </div>
        
        {/* 按钮组 */}
        <div className="mt-8 flex gap-4">
            <button 
                onClick={onClose}
                className="flex-1 py-4 bg-orange-500 text-white font-bold text-2xl border-4 border-black hover:bg-orange-400 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"
            >
                {t(lang, 'ok')}
            </button>

            {/* 放弃本局按钮 - 仅在游戏中显示 */}
            {isInGame && onGiveUp && (
                 <button 
                    onClick={onGiveUp}
                    className="flex-1 py-4 bg-red-600 text-white font-bold text-2xl border-4 border-black hover:bg-red-500 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"
                >
                    {t(lang, 'give_up')}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};
