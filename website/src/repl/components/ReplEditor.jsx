import { useState, useEffect } from 'react';
import { Code } from '@src/repl/components/Code';
import Loader from '@src/repl/components/Loader';
import { BottomPanel, MainPanel, RightPanel } from '@src/repl/components/panel/Panel';
import UserFacingErrorMessage from '@src/repl/components/UserFacingErrorMessage';
import { useSettings, setHasSeenWelcome, setTutorialProgress } from '@src/settings.mjs';
import { WelcomeModal } from '@src/repl/components/WelcomeModal';
import { TutorialOverlay } from '@src/repl/components/TutorialMode';
import { TutorialCompletion } from '@src/repl/components/TutorialMode';
import { isUdels } from '../util.mjs';
import { t } from '@src/i18n/translations.mjs';

// type Props = {
//  context: replcontext,
// }

export default function ReplEditor(Props) {
  const { context, ...editorProps } = Props;
  const { containerRef, editorRef, error, init, pending, started, handleStop } = context;
  const settings = useSettings();
  const { panelPosition, isZen, hasSeenWelcome, language, tutorialProgress = 0 } = settings;
  const isEmbedded = typeof window !== 'undefined' && window.location !== window.parent.location;
  const isUdelsEnv = isUdels();

  const [showWelcome, setShowWelcome] = useState(!isEmbedded && !isUdelsEnv && !hasSeenWelcome);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [tutorialLesson, setTutorialLesson] = useState(Math.min(tutorialProgress, 5));

  const i18n = (key, params = {}) => t(language, key, params);

  const handleStartTutorial = () => {
    setShowWelcome(false);
    setHasSeenWelcome(true);
    setShowTutorial(true);
    setTutorialLesson(Math.min(tutorialProgress, 5));
  };

  const handleSkipWelcome = () => {
    setShowWelcome(false);
    setHasSeenWelcome(true);
  };

  const handleFinishTutorial = () => {
    if (started) {
      handleStop?.();
    }
    setShowTutorial(false);
    setShowCompletion(true);
  };

  const handleCloseCompletion = () => {
    setShowCompletion(false);
  };

  const handleRestartTutorial = () => {
    setShowCompletion(false);
    setShowTutorial(true);
    setTutorialLesson(0);
    setTutorialProgress(0);
  };

  const handleCloseTutorial = () => {
    if (started) {
      handleStop?.();
    }
    setShowTutorial(false);
  };

  const handleLessonChange = (newLesson) => {
    if (started) {
      handleStop?.();
    }
    setTutorialLesson(newLesson);
  };

  return (
    <div className="h-full flex flex-col relative" {...editorProps}>
      <Loader active={pending} />
      <div className="flex flex-col grow overflow-hidden">
        <MainPanel context={context} isEmbedded={isEmbedded} />
        <div className="flex overflow-hidden h-full">
          <Code containerRef={containerRef} editorRef={editorRef} init={init} />
          {!isZen && panelPosition === 'right' && !showTutorial && <RightPanel context={context} />}
        </div>
      </div>
      <UserFacingErrorMessage error={error} />
      {!isZen && panelPosition === 'bottom' && !showTutorial && <BottomPanel context={context} />}

      {showWelcome && (
        <WelcomeModal
          context={context}
          onStartTutorial={handleStartTutorial}
          onSkip={handleSkipWelcome}
        />
      )}

      {showTutorial && (
        <TutorialOverlay
          context={context}
          currentLesson={tutorialLesson}
          onLessonChange={handleLessonChange}
          onFinish={handleFinishTutorial}
          onClose={handleCloseTutorial}
        />
      )}

      {showCompletion && (
        <TutorialCompletion
          onRestart={handleRestartTutorial}
          onClose={handleCloseCompletion}
        />
      )}
    </div>
  );
}
