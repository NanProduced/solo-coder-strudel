import { useState } from 'react';
import { Code } from '@src/repl/components/Code';
import Loader from '@src/repl/components/Loader';
import { BottomPanel, MainPanel, RightPanel } from '@src/repl/components/panel/Panel';
import UserFacingErrorMessage from '@src/repl/components/UserFacingErrorMessage';
import { useSettings } from '@src/settings.mjs';
import { WelcomeModal } from '@src/repl/components/WelcomeModal';
import { TutorialMode, TutorialCompletion } from '@src/repl/components/TutorialMode';
import { isUdels } from '../util.mjs';

// type Props = {
//  context: replcontext,
// }

export default function ReplEditor(Props) {
  const { context, ...editorProps } = Props;
  const { containerRef, editorRef, error, init, pending } = context;
  const settings = useSettings();
  const { panelPosition, isZen, hasSeenWelcome, language } = settings;
  const isEmbedded = typeof window !== 'undefined' && window.location !== window.parent.location;
  const isUdelsEnv = isUdels();

  const [showWelcome, setShowWelcome] = useState(!isEmbedded && !isUdelsEnv && !hasSeenWelcome);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const handleStartTutorial = () => {
    setShowWelcome(false);
    setShowTutorial(true);
  };

  const handleSkipWelcome = () => {
    setShowWelcome(false);
  };

  const handleFinishTutorial = () => {
    setShowTutorial(false);
    setShowCompletion(true);
  };

  const handleCloseCompletion = () => {
    setShowCompletion(false);
  };

  const handleRestartTutorial = () => {
    setShowCompletion(false);
    setShowTutorial(true);
  };

  if (showTutorial) {
    return <TutorialMode context={context} onFinish={handleFinishTutorial} />;
  }

  return (
    <div className="h-full flex flex-col relative" {...editorProps}>
      <Loader active={pending} />
      <div className="flex flex-col grow overflow-hidden">
        {/* <MainPanel context={context} isEmbedded={isEmbedded} className="hidden sm:block" /> */}
        <MainPanel context={context} isEmbedded={isEmbedded} />
        <div className="flex overflow-hidden h-full">
          <Code containerRef={containerRef} editorRef={editorRef} init={init} />
          {!isZen && panelPosition === 'right' && <RightPanel context={context} />}
        </div>
      </div>
      <UserFacingErrorMessage error={error} />
      {!isZen && panelPosition === 'bottom' && <BottomPanel context={context} />}
      {/* <MainPanel context={context} isEmbedded={isEmbedded} className="block sm:hidden" /> */}

      {showWelcome && (
        <WelcomeModal
          context={context}
          onStartTutorial={handleStartTutorial}
          onSkip={handleSkipWelcome}
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
