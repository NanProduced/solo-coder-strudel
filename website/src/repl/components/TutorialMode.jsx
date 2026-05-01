import { useState, useEffect, useRef } from 'react';
import { PlayIcon, StopIcon, ArrowLeftIcon, ArrowRightIcon, LightBulbIcon, CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/16/solid';
import cx from '@src/cx.mjs';
import { useSettings, setTutorialProgress, supportedLanguages, setLanguage } from '../../settings.mjs';
import { validateAnswer, buildLessonPattern, getSyntaxElements } from '@src/i18n/ast-validator.mjs';
import { t, translations } from '@src/i18n/translations.mjs';
import { drawMiniNotation } from '@src/i18n/mini-notation-highlighter.mjs';

const TOTAL_LESSONS = 6;

const COLOR_MAP = {
  note: '#60a5fa',
  group: '#34d399',
  fast: '#fbbf24',
  slowcat: '#a78bfa',
  stack: '#f472b6',
  sequence: '#94a3b8',
  number: '#c084fc',
  operator: '#64748b',
};

function SyntaxLegend({ language }) {
  const i18n = (key) => t(language, key);
  
  const items = [
    { type: 'note', label: 'miniNotation.terms.note', color: COLOR_MAP.note },
    { type: 'group', label: 'miniNotation.terms.group', color: COLOR_MAP.group },
    { type: 'fast', label: 'miniNotation.terms.fast', color: COLOR_MAP.fast },
    { type: 'slowcat', label: 'miniNotation.terms.slowcat', color: COLOR_MAP.slowcat },
    { type: 'stack', label: 'miniNotation.terms.stack', color: COLOR_MAP.stack },
  ];

  return (
    <div className="flex flex-wrap gap-3 p-3 bg-lineHighlight/50 rounded-lg">
      {items.map((item) => (
        <div key={item.type} className="flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded-sm" 
            style={{ backgroundColor: item.color }} 
          />
          <span className="text-xs text-foreground/70">{i18n(item.label)}</span>
        </div>
      ))}
    </div>
  );
}

export function TutorialOverlay({ context, currentLesson, onLessonChange, onFinish, onClose }) {
  const settings = useSettings();
  const { fontFamily, language, tutorialProgress = 0 } = settings;
  
  const [userCode, setUserCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en');
  const [syntaxElements, setSyntaxElements] = useState([]);
  
  const codeInputRef = useRef(null);
  
  const i18n = (key, params = {}) => t(selectedLanguage, key, params);
  
  const lessonKey = `lesson${currentLesson + 1}`;
  const lessonData = translations[selectedLanguage]?.lessons?.[lessonKey] || translations.en.lessons[lessonKey];
  
  useEffect(() => {
    if (lessonData?.placeholder) {
      setUserCode(lessonData.placeholder);
    }
    setCheckResult(null);
    setShowHint(false);
    setIsPlaying(false);
  }, [currentLesson, selectedLanguage]);

  useEffect(() => {
    if (userCode) {
      const elements = getSyntaxElements(userCode);
      setSyntaxElements(elements);
    } else {
      setSyntaxElements([]);
    }
  }, [userCode]);

  useEffect(() => {
    if (checkResult?.valid && currentLesson >= tutorialProgress) {
      setTutorialProgress(currentLesson + 1);
    }
  }, [checkResult, currentLesson, tutorialProgress]);
  
  useEffect(() => {
    return () => {
      if (isPlaying && context?.handleStop) {
        context.handleStop();
      }
    };
  }, [isPlaying, context]);
  
  const handlePlay = async () => {
    if (!context) return;
    
    if (isPlaying) {
      context.handleStop?.();
      setIsPlaying(false);
    } else {
      const patternCode = buildLessonPattern(userCode, lessonKey);
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
    if (!lessonData || !userCode.trim()) {
      setCheckResult({ valid: false, error: 'Please enter your answer' });
      return;
    }
    
    const result = validateAnswer(userCode, lessonData.verifySyntax);
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
  };
  
  const progressPercent = ((currentLesson + 1) / TOTAL_LESSONS) * 100;
  const isLastLesson = currentLesson === TOTAL_LESSONS - 1;
  const canProceed = checkResult?.valid === true;

  const renderCodeWithHighlighting = () => {
    if (!userCode) return userCode;
    return drawMiniNotation(userCode, 'html');
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex">
      <div className="flex-1" />
      
      <div className="w-[480px] flex flex-col bg-background border-l border-muted shadow-2xl">
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
            
            <div className="flex items-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="px-2 py-1 text-xs rounded bg-background border border-muted text-foreground focus:outline-none"
              >
                {Object.entries(supportedLanguages).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={onClose}
                className="p-1.5 text-foreground/50 hover:text-foreground hover:bg-lineHighlight rounded transition-colors"
                title={i18n('controls.settings')}
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
                <p className="text-xs text-foreground/60 mb-1">{i18n('miniNotation.terms.sequence')}:</p>
                <code 
                  className="text-sm font-mono"
                  dangerouslySetInnerHTML={{ __html: renderCodeWithHighlighting.call({ userCode: lessonData?.example || '' }) }}
                />
              </div>
              
              <p className="text-foreground/70 text-sm">
                {lessonData?.explanation}
              </p>
            </div>
            
            <div className="mb-3">
              <SyntaxLegend language={selectedLanguage} />
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
                
                <div className="relative">
                  <input
                    ref={codeInputRef}
                    type="text"
                    value={userCode}
                    onChange={(e) => {
                      setUserCode(e.target.value);
                      setCheckResult(null);
                    }}
                    placeholder={lessonData?.placeholder}
                    className="w-full px-3 py-2.5 rounded-lg bg-background border border-muted text-foreground font-mono text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{ fontFamily }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckAnswer();
                      }
                    }}
                  />
                  {userCode && (
                    <div className="absolute inset-0 px-3 py-2.5 pointer-events-none overflow-hidden">
                      <span 
                        className="font-mono text-base whitespace-pre"
                        style={{ fontFamily, color: 'transparent' }}
                      >
                        {userCode}
                      </span>
                      <div className="absolute bottom-1 left-3 right-3 h-0.5 overflow-hidden">
                        {syntaxElements.map((elem, idx) => {
                          const color = COLOR_MAP[elem.type] || COLOR_MAP.note;
                          const charWidth = 8.4;
                          const left = elem.start * charWidth;
                          const width = Math.max((elem.end - elem.start) * charWidth, charWidth * 0.5);
                          
                          return (
                            <div
                              key={idx}
                              className="absolute h-0.5 rounded-full opacity-80"
                              style={{
                                left: `${left}px`,
                                width: `${width}px`,
                                backgroundColor: color,
                                boxShadow: `0 0 6px ${color}`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {syntaxElements.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {syntaxElements.map((elem, idx) => {
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
