import { useState, useEffect, useRef } from 'react';
import { PlayIcon, StopIcon, ArrowLeftIcon, ArrowRightIcon, LightBulbIcon, CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/16/solid';
import cx from '@src/cx.mjs';
import { useSettings, setTutorialProgress, supportedLanguages, setLanguage } from '../../settings.mjs';
import { validateAnswer, buildLessonPattern, getSyntaxElements } from '@src/i18n/ast-validator.mjs';
import { t, translations } from '@src/i18n/translations.mjs';
import { TutorialCodeEditor, CodeWithHighlight, SyntaxLegend, COLOR_MAP } from '@src/repl/components/TutorialCodeEditor';
import { renderMiniNotationHTML } from '@src/i18n/mini-notation-highlighter.mjs';

const TOTAL_LESSONS = 6;

export function TutorialOverlay({ context, currentLesson, onLessonChange, onFinish, onClose }) {
  const settings = useSettings();
  const { fontFamily, language, tutorialProgress = 0 } = settings;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentUserCode, setCurrentUserCode] = useState('');
  
  const editorRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const i18n = (key, params = {}) => t(selectedLanguage, key, params);
  
  const lessonKey = `lesson${currentLesson + 1}`;
  const lessonData = translations[selectedLanguage]?.lessons?.[lessonKey] || translations.en.lessons[lessonKey];
  
  useEffect(() => {
    if (lessonData?.placeholder) {
      setCurrentUserCode(lessonData.placeholder);
      setTimeout(() => {
        editorRef.current?.setCode?.(lessonData.placeholder);
      }, 50);
    }
    setCheckResult(null);
    setShowHint(false);
    setIsPlaying(false);
  }, [currentLesson, selectedLanguage]);

  useEffect(() => {
    if (checkResult?.valid && currentLesson >= tutorialProgress) {
      setTutorialProgress(currentLesson + 1);
    }
  }, [checkResult, currentLesson, tutorialProgress]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (isPlaying && context?.handleStop) {
        context.handleStop();
      }
    };
  }, [isPlaying, context]);
  
  const handleCodeChange = (code) => {
    setCurrentUserCode(code);
    setCheckResult(null);
  };

  const handlePlay = async () => {
    if (!context) return;
    
    if (isPlaying) {
      context.handleStop?.();
      setIsPlaying(false);
    } else {
      const codeToPlay = editorRef.current?.getCode?.() || currentUserCode || lessonData?.placeholder || '';
      const patternCode = buildLessonPattern(codeToPlay, lessonKey);
      context.editorRef?.current?.setCode?.(patternCode);
      setTimeout(() => {
        context.handleEvaluate?.();
        setIsPlaying(true);
      }, 50);
    }
  };
  
  const handleStop = () => {
    if (context?.handleStop) {
      context.handleStop();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (context?.started === false && isPlaying) {
      setIsPlaying(false);
    }
  }, [context?.started, isPlaying]);
  
  const handleCheckAnswer = () => {
    const codeToCheck = editorRef.current?.getCode?.() || currentUserCode;
    
    if (!codeToCheck?.trim()) {
      setCheckResult({ 
        valid: false, 
        error: i18n('tutorial.errors.pleaseEnterAnswer') 
      });
      return;
    }
    
    const result = validateAnswer(codeToCheck, lessonData.verifySyntax);
    setCheckResult(result);
  };
  
  const handleNext = () => {
    handleStop();
    if (currentLesson < TOTAL_LESSONS - 1) {
      onLessonChange?.(currentLesson + 1);
      setCheckResult(null);
      setShowHint(false);
    } else {
      onFinish?.();
    }
  };
  
  const handleBack = () => {
    handleStop();
    if (currentLesson > 0) {
      onLessonChange?.(currentLesson - 1);
      setCheckResult(null);
      setShowHint(false);
    }
  };
  
  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
    setShowLanguageDropdown(false);
  };
  
  const progressPercent = ((currentLesson + 1) / TOTAL_LESSONS) * 100;
  const isLastLesson = currentLesson === TOTAL_LESSONS - 1;
  const canProceed = checkResult?.valid === true;

  const exampleCode = lessonData?.example || '';
  
  return (
    <div className="fixed inset-0 z-[200] flex">
      <div className="flex-1" />
      
      <div className="w-[520px] flex flex-col bg-background border-l border-muted shadow-2xl">
        <div className="flex-none border-b border-muted bg-lineHighlight px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-foreground">
                {i18n('tutorial.title')}
              </h2>
              <span className="text-xs text-foreground/70 bg-foreground/10 px-2 py-0.5 rounded">
                {i18n('tutorial.progress', { current: currentLesson + 1, total: TOTAL_LESSONS })}
              </span>
            </div>
            
            <div className="flex items-center gap-2" ref={dropdownRef}>
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded bg-background border border-muted text-foreground hover:bg-lineHighlight transition-colors"
                >
                  <span className="uppercase font-medium">{selectedLanguage}</span>
                </button>
                
                {showLanguageDropdown && (
                  <div className="absolute top-full right-0 mt-1 bg-background border border-muted rounded-lg shadow-xl z-[300] min-w-32 overflow-hidden">
                    {Object.entries(supportedLanguages).map(([code, name]) => (
                      <button
                        key={code}
                        onClick={() => handleLanguageChange(code)}
                        className={cx(
                          'w-full px-3 py-2 text-left text-sm hover:bg-lineHighlight transition-colors',
                          selectedLanguage === code 
                            ? 'text-blue-500 font-medium bg-blue-500/10' 
                            : 'text-foreground'
                        )}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="p-1.5 text-foreground/50 hover:text-foreground hover:bg-lineHighlight rounded transition-colors"
                title={i18n('tutorial.close')}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground mb-2">
                {lessonData?.title}
              </h3>
              <p className="text-foreground/80 leading-relaxed text-sm mb-3">
                {lessonData?.description}
              </p>
              
              <div className="p-3 rounded-lg bg-lineHighlight border border-muted mb-3">
                <p className="text-xs text-foreground/60 mb-2">{i18n('tutorial.example')}:</p>
                {exampleCode && (
                  <CodeWithHighlight code={exampleCode} />
                )}
              </div>
              
              <p className="text-foreground/70 text-sm">
                {lessonData?.explanation}
              </p>
            </div>
            
            <div className="mb-3">
              <SyntaxLegend language={selectedLanguage} t={i18n} />
            </div>
            
            <div className="border border-muted rounded-xl overflow-hidden mb-4">
              <div className="bg-lineHighlight px-3 py-2 border-b border-muted flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {i18n(`lessons.${lessonKey}.task`)}
                </span>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={cx(
                    'flex items-center gap-1 text-xs transition-colors',
                    showHint ? 'text-yellow-400' : 'text-foreground/50 hover:text-foreground/70'
                  )}
                >
                  <LightBulbIcon className="w-3.5 h-3.5" />
                  {i18n('tutorial.showHint')}
                </button>
              </div>
              
              <div className="p-3">
                {showHint && (
                  <div className="mb-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-400">
                      💡 {lessonData?.hint}
                    </p>
                  </div>
                )}
                
                <TutorialCodeEditor
                  ref={editorRef}
                  initialCode={currentUserCode || lessonData?.placeholder || ''}
                  onChange={handleCodeChange}
                  theme="strudelTheme"
                  fontSize={16}
                  className="mb-0"
                />
                
                {currentUserCode && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {getSyntaxElements(currentUserCode)
                      .filter(e => e.type !== 'sequence' && e.type !== 'operator')
                      .map((elem, idx) => {
                        const color = COLOR_MAP[elem.type] || COLOR_MAP.note;
                        const label = i18n(`miniNotation.terms.${elem.type}`) || elem.type;
                        return (
                          <span 
                            key={idx}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ 
                              backgroundColor: `${color}20`,
                              color: color,
                              borderLeft: `2px solid ${color}`
                            }}
                          >
                            {elem.text} → {label}
                          </span>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handlePlay}
                className={cx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  isPlaying
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                )}
              >
                {isPlaying ? (
                  <><StopIcon className="w-4 h-4" /> {i18n('tutorial.stopPattern')}</>
                ) : (
                  <><PlayIcon className="w-4 h-4" /> {i18n('tutorial.playPattern')}</>
                )}
              </button>
              
              <button
                onClick={handleCheckAnswer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-all"
              >
                {i18n('tutorial.checkAnswer')}
              </button>
            </div>
            
            {checkResult !== null && (
              <div className={cx(
                'p-3 rounded-lg border mb-4',
                checkResult.valid
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              )}>
                <div className="flex items-center gap-2">
                  {checkResult.valid ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-400" />
                  )}
                  <span className={cx(
                    'text-sm font-medium',
                    checkResult.valid ? 'text-green-400' : 'text-red-400'
                  )}>
                    {checkResult.valid ? i18n('tutorial.correct') : i18n('tutorial.incorrect')}
                  </span>
                </div>
                {checkResult.error && (
                  <p className="text-xs text-red-400/70 mt-1.5">
                    {checkResult.error}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-muted">
              <button
                onClick={handleBack}
                disabled={currentLesson === 0}
                className={cx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  currentLesson === 0
                    ? 'text-foreground/30 cursor-not-allowed'
                    : 'text-foreground/70 hover:text-foreground hover:bg-lineHighlight'
                )}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {i18n('tutorial.back')}
              </button>
              
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={cx(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                  canProceed
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-muted text-foreground/30 cursor-not-allowed'
                )}
              >
                {isLastLesson ? i18n('tutorial.finish') : i18n('tutorial.next')}
                {!isLastLesson && <ArrowRightIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TutorialCompletion({ onRestart, onClose }) {
  const settings = useSettings();
  const { fontFamily, language } = settings;
  
  const i18n = (key, params = {}) => t(language, key, params);
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div 
        className="relative max-w-md w-full mx-4 rounded-xl bg-background shadow-2xl border border-muted p-6 text-center"
        style={{ fontFamily }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-foreground/40 hover:text-foreground hover:bg-lineHighlight rounded transition-colors"
          aria-label={i18n('tutorial.close')}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            {i18n('completion.title')}
          </h2>
          <p className="text-base text-foreground/80 mb-2">
            {i18n('completion.message')}
          </p>
          <p className="text-foreground/70 text-sm">
            {i18n('completion.description')}
          </p>
        </div>
        
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
            {i18n('completion.nextSteps')}
          </h3>
          
          <div className="grid gap-2">
            <button
              onClick={onClose}
              className="w-full px-3 py-2.5 rounded-lg bg-blue-500/20 text-blue-400 font-medium hover:bg-blue-500/30 transition-all text-left"
            >
              <span className="block text-sm">{i18n('completion.tryPatterns')}</span>
              <span className="block text-xs text-blue-400/70 mt-0.5">
                Explore community patterns and get inspired
              </span>
            </button>
            
            <button
              onClick={onRestart}
              className="w-full px-3 py-2.5 rounded-lg border border-muted text-foreground font-medium hover:bg-lineHighlight transition-all text-left"
            >
              <span className="block text-sm">{i18n('completion.backToEditor')}</span>
              <span className="block text-xs text-foreground/70 mt-0.5">
                Start coding your own patterns
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TutorialMode({ context, onFinish }) {
  return null;
}
