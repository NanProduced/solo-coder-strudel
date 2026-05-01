import { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, XMarkIcon } from '@heroicons/react/16/solid';
import cx from '@src/cx.mjs';
import { useSettings, setHasSeenWelcome, supportedLanguages, setLanguage } from '../../settings.mjs';
import { demoPatterns } from '@src/i18n/ast-validator.mjs';
import { t } from '@src/i18n/translations.mjs';
import { StrudelIcon } from '@src/repl/components/icons/StrudelIcon';

export function WelcomeModal({ context, onStartTutorial, onSkip }) {
  const settings = useSettings();
  const { fontFamily, language } = settings;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en');
  
  const i18n = (key, params = {}) => t(selectedLanguage, key, params);
  
  useEffect(() => {
    return () => {
      if (isPlaying) {
        context?.handleStop?.();
      }
    };
  }, [isPlaying, context]);
  
  const handlePlayDemo = async () => {
    if (!audioEnabled) {
      try {
        const audioContext = window?.AudioContext || window?.webkitAudioContext;
        if (audioContext) {
          const ctx = new audioContext();
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
        }
        setAudioEnabled(true);
      } catch (e) {
        console.warn('Could not initialize audio context:', e);
      }
    }
    
    if (context) {
      if (isPlaying) {
        context.handleStop?.();
        setIsPlaying(false);
      } else {
        const demoCode = demoPatterns.welcome;
        context.editorRef?.current?.setCode?.(demoCode);
        setTimeout(() => {
          context.handleEvaluate?.();
          setIsPlaying(true);
        }, 100);
      }
    }
  };
  
  const handleSkip = () => {
    setHasSeenWelcome(true);
    if (isPlaying) {
      context?.handleStop?.();
    }
    onSkip?.();
  };
  
  const handleStartTutorial = () => {
    setHasSeenWelcome(true);
    if (isPlaying) {
      context?.handleStop?.();
    }
    if (selectedLanguage !== language) {
      setLanguage(selectedLanguage);
    }
    onStartTutorial?.();
  };
  
  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="relative max-w-2xl w-full mx-4 rounded-xl bg-background shadow-2xl border border-muted overflow-hidden"
        style={{ fontFamily }}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={handleSkip}
            className="p-2 rounded-lg hover:bg-muted text-foreground/70 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="p-3 rounded-full bg-blue-500/10">
              <StrudelIcon className="w-12 h-12 text-blue-500 rotate-90" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-center text-foreground mb-2">
            {i18n('welcome.title')}
          </h2>
          <p className="text-center text-foreground/70 mb-6">
            {i18n('welcome.subtitle')}
          </p>
          
          <p className="text-foreground/80 mb-8 text-center leading-relaxed">
            {i18n('welcome.description')}
          </p>
          
          <div className="mb-8 p-6 rounded-xl bg-lineHighlight">
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span>🎵</span>
              {i18n('welcome.demoTitle')}
            </h3>
            <p className="text-foreground/70 text-sm mb-4">
              {i18n('welcome.demoDescription')}
            </p>
            
            <button
              onClick={handlePlayDemo}
              className={cx(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all',
                isPlaying
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
              )}
            >
              {isPlaying ? (
                <><StopIcon className="w-5 h-5" /> {i18n('welcome.stopDemo')}</>
              ) : (
                <><PlayIcon className="w-5 h-5" /> {i18n('welcome.playDemo')}</>
              )}
            </button>
            
            {audioEnabled && (
              <p className="text-green-400 text-sm mt-3 text-center">
                {i18n('welcome.audioEnabled')}
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              {i18n('settings.language')}
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-lineHighlight border border-muted text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(supportedLanguages).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleStartTutorial}
              className="flex-1 px-6 py-3 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <PlayIcon className="w-5 h-5" />
              {i18n('welcome.tutorialButton')}
            </button>
            
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 rounded-lg border border-muted text-foreground font-medium hover:bg-lineHighlight transition-colors"
            >
              {i18n('welcome.skipButton')}
            </button>
          </div>
          
          <p className="text-center text-foreground/50 text-sm mt-6">
            {i18n('welcome.tutorialIntro')}
          </p>
        </div>
      </div>
    </div>
  );
}
