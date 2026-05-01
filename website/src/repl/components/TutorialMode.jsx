import { useState, useEffect } from 'react';
import { PlayIcon, StopIcon, ArrowLeftIcon, ArrowRightIcon, LightBulbIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/16/solid';
import cx from '@src/cx.mjs';
import { useSettings, setTutorialProgress, supportedLanguages, setLanguage } from '../../settings.mjs';
import { validateAnswer, buildLessonPattern, getSyntaxElements } from '@src/i18n/ast-validator.mjs';
import { t, translations } from '@src/i18n/translations.mjs';

const TOTAL_LESSONS = 6;

export function TutorialMode({ context, onFinish }) {
  const settings = useSettings();
  const { fontFamily, language, tutorialProgress = 0 } = settings;
  
  const [currentLesson, setCurrentLesson] = useState(Math.min(tutorialProgress, TOTAL_LESSONS));
  const [userCode, setUserCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language || 'en');
  
  const i18n = (key, params = {}) => t(selectedLanguage, key, params);
  
  const lessonKey = `lesson${currentLesson + 1}`;
  const lessonData = translations[selectedLanguage]?.lessons?.[lessonKey] || translations.en.lessons[lessonKey];
  
  useEffect(() => {
    if (lessonData?.placeholder) {
      setUserCode(lessonData.placeholder);
    }
    setCheckResult(null);
    setShowHint(false);
  }, [currentLesson, selectedLanguage]);
  
  useEffect(() => {
    return () => {
      if (isPlaying) {
        context?.handleStop?.();
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
      }, 100);
    }
  };
  
  const handleCheckAnswer = () => {
    if (!lessonData || !userCode.trim()) {
      setCheckResult({ valid: false, error: 'Please enter your answer' });
      return;
    }
    
    const result = validateAnswer(userCode, lessonData.verifySyntax);
    setCheckResult(result);
    
    if (result.valid) {
      setTutorialProgress(currentLesson + 1);
    }
  };
  
  const handleNext = () => {
    if (currentLesson < TOTAL_LESSONS - 1) {
      setCurrentLesson(currentLesson + 1);
      setCheckResult(null);
      setShowHint(false);
    } else {
      onFinish?.();
    }
  };
  
  const handleBack = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
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
  
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <div className="flex-none border-b border-muted bg-lineHighlight px-6 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">
              {i18n('tutorial.title')}
            </h2>
            <span className="text-sm text-foreground/70">
              {i18n('tutorial.progress', { current: currentLesson + 1, total: TOTAL_LESSONS })}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 text-sm rounded bg-background border border-muted text-foreground focus:outline-none"
            >
              {Object.entries(supportedLanguages).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            
            <button
              onClick={onFinish}
              className="text-sm text-foreground/70 hover:text-foreground underline"
            >
              {i18n('tutorial.restart')}
            </button>
          </div>
        </div>
        
        <div className="max-w-4xl mx-auto mt-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-foreground mb-3">
              {lessonData?.title}
            </h3>
            <p className="text-foreground/80 leading-relaxed mb-4">
              {lessonData?.description}
            </p>
            
            <div className="p-4 rounded-lg bg-lineHighlight border border-muted mb-4">
              <p className="text-sm text-foreground/70 mb-2">Example:</p>
              <code className="text-sm font-mono text-blue-400">
                {lessonData?.example}
              </code>
            </div>
            
            <p className="text-foreground/70 text-sm">
              {lessonData?.explanation}
            </p>
          </div>
          
          <div className="border border-muted rounded-xl overflow-hidden mb-6">
            <div className="bg-lineHighlight px-4 py-2 border-b border-muted flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {i18n(`lessons.${lessonKey}.task`)}
              </span>
              <button
                onClick={() => setShowHint(!showHint)}
                className={cx(
                  'flex items-center gap-1 text-sm transition-colors',
                  showHint ? 'text-yellow-400' : 'text-foreground/50 hover:text-foreground/70'
                )}
              >
                <LightBulbIcon className="w-4 h-4" />
                {i18n('tutorial.showHint')}
              </button>
            </div>
            
            <div className="p-4">
              {showHint && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-400">
                    💡 {lessonData?.hint}
                  </p>
                </div>
              )}
              
              <input
                type="text"
                value={userCode}
                onChange={(e) => {
                  setUserCode(e.target.value);
                  setCheckResult(null);
                }}
                placeholder={lessonData?.placeholder}
                className="w-full px-4 py-3 rounded-lg bg-background border border-muted text-foreground font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCheckAnswer();
                  }
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handlePlay}
              className={cx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                isPlaying
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              )}
            >
              {isPlaying ? (
                <><StopIcon className="w-5 h-5" /> {i18n('tutorial.stopPattern')}</>
              ) : (
                <><PlayIcon className="w-5 h-5" /> {i18n('tutorial.playPattern')}</>
              )}
            </button>
            
            <button
              onClick={handleCheckAnswer}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 font-medium hover:bg-blue-500/30 transition-all"
            >
              {i18n('tutorial.checkAnswer')}
            </button>
          </div>
          
          {checkResult !== null && (
            <div className={cx(
              'p-4 rounded-lg border mb-6',
              checkResult.valid
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            )}>
              <div className="flex items-center gap-2">
                {checkResult.valid ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircleIcon className="w-6 h-6 text-red-400" />
                )}
                <span className={cx(
                  'font-medium',
                  checkResult.valid ? 'text-green-400' : 'text-red-400'
                )}>
                  {checkResult.valid ? i18n('tutorial.correct') : i18n('tutorial.incorrect')}
                </span>
              </div>
              {checkResult.error && (
                <p className="text-sm text-red-400/70 mt-2">
                  {checkResult.error}
                </p>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentLesson === 0}
              className={cx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                currentLesson === 0
                  ? 'text-foreground/30 cursor-not-allowed'
                  : 'text-foreground/70 hover:text-foreground hover:bg-lineHighlight'
              )}
            >
              <ArrowLeftIcon className="w-5 h-5" />
              {i18n('tutorial.back')}
            </button>
            
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={cx(
                'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
                canProceed
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-muted text-foreground/30 cursor-not-allowed'
              )}
            >
              {isLastLesson ? i18n('tutorial.finish') : i18n('tutorial.next')}
              {!isLastLesson && <ArrowRightIcon className="w-5 h-5" />}
            </button>
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
        className="relative max-w-lg w-full mx-4 rounded-xl bg-background shadow-2xl border border-muted p-8 text-center"
        style={{ fontFamily }}
      >
        <div className="mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {i18n('completion.title')}
          </h2>
          <p className="text-lg text-foreground/80 mb-4">
            {i18n('completion.message')}
          </p>
          <p className="text-foreground/70">
            {i18n('completion.description')}
          </p>
        </div>
        
        <div className="space-y-3 mb-8">
          <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
            {i18n('completion.nextSteps')}
          </h3>
          
          <div className="grid gap-3">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-lg bg-blue-500/20 text-blue-400 font-medium hover:bg-blue-500/30 transition-all text-left"
            >
              <span className="block font-medium">{i18n('completion.tryPatterns')}</span>
              <span className="block text-sm text-blue-400/70 mt-1">
                Explore community patterns and get inspired
              </span>
            </button>
            
            <button
              onClick={onRestart}
              className="w-full px-4 py-3 rounded-lg border border-muted text-foreground font-medium hover:bg-lineHighlight transition-all text-left"
            >
              <span className="block font-medium">{i18n('completion.backToEditor')}</span>
              <span className="block text-sm text-foreground/70 mt-1">
                Start coding your own patterns
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
