import { Bars3Icon, PlayIcon, StopIcon, XMarkIcon, ArrowsPointingOutIcon, ArrowPathIcon } from '@heroicons/react/16/solid';
import cx from '@src/cx.mjs';
import { StrudelIcon } from '@src/repl/components/icons/StrudelIcon';
import { useSettings, setIsZen, setIsPanelOpened, setActiveFooter as setTab, supportedLanguages, setLanguage, useI18n } from '../../../settings.mjs';
import '../../Repl.css';
import { useLogger } from '../useLogger';
import { ConsoleTab } from './ConsoleTab';
import ExportTab from './ExportTab';
import { FilesTab } from './FilesTab';
import { PatternsTab } from './PatternsTab';
import { Reference } from './Reference';
import { SettingsTab } from './SettingsTab';
import { SoundsTab } from './SoundsTab';
import { WelcomeTab } from './WelcomeTab';
import useFrame from '../../../useFrame.mjs';
import { useState, useEffect, useRef } from 'react';

const TAURI = typeof window !== 'undefined' && window.__TAURI__;

const { BASE_URL } = import.meta.env;
const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

function CycleProgressBar({ context }) {
  const { editorRef, started } = context;
  const [cycleProgress, setCycleProgress] = useState(0);
  const [cps, setCps] = useState(0.5);
  const [currentCycle, setCurrentCycle] = useState(0);
  const { lang, t } = useI18n();

  const updateProgress = () => {
    if (!started || !editorRef?.current?.repl?.scheduler) {
      setCycleProgress(0);
      return;
    }

    const scheduler = editorRef.current.repl.scheduler;
    const currentCps = scheduler.cps || 0.5;
    setCps(currentCps);

    const cycleTime = scheduler.now();
    setCurrentCycle(Math.floor(cycleTime));
    const progress = cycleTime - Math.floor(cycleTime);
    setCycleProgress(progress % 1);
  };

  useFrame(updateProgress, started);

  useEffect(() => {
    if (!started) {
      setCycleProgress(0);
    }
  }, [started]);

  const cycleLabel = t('controls.cycle') || 'Cycle';

  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex flex-col items-start">
        <span className="text-xs text-foreground/60">{cycleLabel}</span>
        <span className="text-xs text-foreground/80 font-mono">
          {started ? `${currentCycle} (${cps.toFixed(2)} cps)` : '--'}
        </span>
      </div>
      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden relative">
        <div
          className="h-full bg-blue-500 transition-all duration-75"
          style={{ width: `${cycleProgress * 100}%` }}
        />
        {started && (
          <div
            className="absolute top-0 h-full w-1 bg-white shadow-lg"
            style={{ left: `${cycleProgress * 100}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>
    </div>
  );
}

function LanguageButton() {
  const { lang, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languageLabel = t('settings.language') || 'Language';

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 text-sm text-foreground hover:opacity-70 transition-opacity"
        title={languageLabel}
      >
        <span className="uppercase font-medium">{lang}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-background border border-muted rounded-lg shadow-lg z-50 min-w-32">
          {Object.entries(supportedLanguages).map(([code, name]) => (
            <button
              key={code}
              onClick={() => {
                setLanguage(code);
                setIsOpen(false);
              }}
              className={cx(
                'w-full px-3 py-2 text-left text-sm hover:bg-lineHighlight transition-colors',
                lang === code ? 'text-blue-500 font-medium' : 'text-foreground',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LogoButton({ context, isEmbedded }) {
  const { started } = context;
  const { isZen, isCSSAnimationDisabled, fontFamily } = useSettings();
  return (
    <div
      className={cx(
        'mt-[1px]',
        started && !isCSSAnimationDisabled && 'animate-spin',
        'cursor-pointer text-blue-500',
        isZen && 'fixed top-2 right-4',
      )}
      onClick={() => {
        if (!isEmbedded) {
          setIsZen(!isZen);
        }
      }}
    >
      <span className="block text-foreground rotate-90">
        <StrudelIcon className="w-5 h-5 fill-foreground" />
      </span>
    </div>
  );
}

export function MainPanel({ context, isEmbedded = false, className }) {
  const { isZen, isButtonRowHidden, fontFamily } = useSettings();
  let loc = window.location;
  let ver = 'unofficial';
  let hot = false;
  let b = loc.hostname.match(/^(.+)\.(strudel)/);
  if (/(strudel.cc$)/.test(loc.hostname)) {
    // if there's no text before 'strudel', it's warm, otherwise use the text before strudel
    ver = b ? b[1] : 'warm';
  } else {
    // match both versions of localhost
    if (/(localhost)|(127.0.0.1)/.test(loc.hostname)) ver = 'dev';
  }
  let pr = ver.match(/pr-([0-9]+)/);
  if (pr) {
    pr = pr[1];
    ver = `hot: ${pr}`;
    hot = true;
    pr = `https://codeberg.org/uzu/strudel/pulls/${pr}`;
  }

  return (
    <nav
      id="header"
      className={cx(
        'flex-none text-black z-[100] text-sm select-none min-h-10 max-h-10',
        !isZen && !isEmbedded && 'border-b border-muted bg-lineHighlight',
        isZen ? 'h-12 w-8 fixed top-0 left-0' : '',
        'flex items-center',
        className,
      )}
      style={{ fontFamily }}
    >
      <div className={cx('flex w-full justify-between')}>
        <div className="px-3 py-1 flex space-x-2 select-none">
          <h1
            onClick={() => {
              if (isEmbedded) window.open(window.location.href.replace('embed', ''));
            }}
            className={cx(
              isEmbedded ? 'text-l cursor-pointer' : 'text-xl',
              'text-foreground font-bold flex space-x-2 items-center',
            )}
          >
            <LogoButton context={context} isEmbedded={isEmbedded} />
            {!isZen && (
              <div className="space-x-2 flex items-baseline">
                <span className="hidden sm:block">strudel</span>
                <span className="text-sm font-medium hidden sm:block">REPL</span>
                {!hot ? (
                  <span className="text-sm font-medium hidden sm:block">({ver})</span>
                ) : (
                  <a className="hover:opacity-50" href={pr} target="_blank">
                    <span className="text-sm font-medium hidden sm:block">({ver})</span>
                  </a>
                )}
              </div>
            )}
          </h1>
        </div>
        {!isZen && (
          <div className="flex grow justify-end">
            {!isButtonRowHidden && <MainMenu isEmbedded={isEmbedded} context={context} />}
            <PanelToggle isEmbedded={isEmbedded} isZen={isZen} />
          </div>
        )}
      </div>
    </nav>
  );
}

export function Footer({ context, isEmbedded = false }) {
  return (
    <div className="border-t border-muted bg-lineHighlight block lg:hidden">
      <MainMenu context={context} isEmbedded={isEmbedded} />
    </div>
  );
}

function MainMenu({ context, isEmbedded = false, className }) {
  const { started, pending, isDirty, activeCode, handleTogglePlay, handleEvaluate, handleShare } = context;
  const { isCSSAnimationDisabled } = useSettings();
  const { t } = useI18n();

  const playLabel = t('controls.play') || 'Play';
  const stopLabel = t('controls.stop') || 'Stop';
  const updateLabel = t('controls.update') || 'Update';
  const shareLabel = t('controls.share') || 'Share';
  const learnLabel = t('controls.learn') || 'Learn';

  return (
    <div className={cx('flex items-center text-sm max-w-full shrink-0 overflow-hidden text-foreground px-2 h-10 gap-1', className)}>
      <button
        onClick={handleTogglePlay}
        title={started ? stopLabel : playLabel}
        className={cx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all',
          started
            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            : 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
          !started && !isCSSAnimationDisabled && 'animate-pulse',
        )}
      >
        {started ? <StopIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
        <span className="font-medium">{pending ? '...' : started ? stopLabel : playLabel}</span>
      </button>

      <button
        onClick={handleEvaluate}
        title={updateLabel}
        className={cx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all',
          !isDirty || !activeCode
            ? 'opacity-40 cursor-not-allowed'
            : 'bg-foreground/10 text-foreground hover:bg-foreground/20',
        )}
        disabled={!isDirty || !activeCode}
      >
        <ArrowPathIcon className="w-5 h-5" />
        <span className="font-medium">{updateLabel}</span>
      </button>

      {!isEmbedded && (
        <button
          title={shareLabel}
          className={cx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all',
            'bg-foreground/10 text-foreground hover:bg-foreground/20',
          )}
          onClick={handleShare}
        >
          <ArrowsPointingOutIcon className="w-5 h-5" />
          <span className="font-medium">{shareLabel}</span>
        </button>
      )}

      {!isEmbedded && (
        <a
          title={learnLabel}
          href={`${baseNoTrailing}/workshop/getting-started/`}
          className={cx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all',
            'bg-foreground/10 text-foreground hover:bg-foreground/20',
          )}
        >
          <span className="font-medium">{learnLabel}</span>
        </a>
      )}

      {!isEmbedded && <div className="w-px h-6 bg-muted mx-1" />}
      {!isEmbedded && <CycleProgressBar context={context} />}
      {!isEmbedded && <div className="w-px h-6 bg-muted mx-1" />}
      {!isEmbedded && <LanguageButton />}
    </div>
  );
}

function PanelCloseButton() {
  const { isPanelOpen } = useSettings();
  return (
    isPanelOpen && (
      <button
        onClick={() => setIsPanelOpened(false)}
        className={cx('px-2 py-0 text-foreground hover:opacity-50')}
        aria-label="Close Menu"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>
    )
  );
}

export function BottomPanel({ context }) {
  const { isPanelOpen, activeFooter: tab } = useSettings();
  return (
    <PanelNav
      className={cx(
        isPanelOpen ? `min-h-[360px] max-h-[360px]` : 'min-h-10 max-h-10',
        'overflow-hidden flex flex-col relative',
      )}
    >
      <div className="flex justify-between min-h-10 max-h-10 grid-cols-2 items-center border-t border-muted">
        <PanelCloseButton />
        <Tabs setTab={setTab} tab={tab} className={cx(isPanelOpen && 'border-l border-muted')} />
      </div>
      {isPanelOpen && (
        <div className="w-full h-full overflow-auto border-t border-muted">
          <PanelContent context={context} tab={tab} />
        </div>
      )}
    </PanelNav>
  );
}

export function RightPanel({ context }) {
  const settings = useSettings();
  const { activeFooter: tab, isPanelOpen } = settings;
  if (!isPanelOpen) {
    return;
  }
  return (
    <PanelNav
      settings={settings}
      className={cx(
        'border-l border-muted shrink-0 h-full overflow-hidden',
        isPanelOpen ? `min-w-[min(600px,100vw)] max-w-[min(600px,80vw)]` : 'min-w-12 max-w-12',
      )}
    >
      <div className={cx('flex flex-col h-full')}>
        <div className="flex justify-between w-full overflow-hidden border-b border-muted min-h-10 max-h-10">
          <PanelCloseButton />
          <Tabs setTab={setTab} tab={tab} className="border-l border-muted" />
        </div>
        <div className="overflow-auto h-full">
          <PanelContent context={context} tab={tab} />
        </div>
      </div>
    </PanelNav>
  );
}

const tabNames = {
  welcome: 'intro',
  patterns: 'patterns',
  sounds: 'sounds',
  reference: 'reference',
  export: 'export',
  console: 'console',
  settings: 'settings',
};
if (TAURI) {
  tabNames.files = 'files';
}

function PanelNav({ children, className, ...props }) {
  const settings = useSettings();
  return (
    <nav
      onClick={() => {
        if (!settings.isPanelOpen) {
          setIsPanelOpened(true);
        }
      }}
      aria-label="Menu Panel"
      className={cx('h-full bg-lineHighlight group overflow-x-auto', className)}
      {...props}
    >
      {children}
    </nav>
  );
}

function PanelContent({ context, tab }) {
  useLogger();
  switch (tab) {
    case tabNames.patterns:
      return <PatternsTab context={context} />;
    case tabNames.console:
      return <ConsoleTab />;
    case tabNames.sounds:
      return <SoundsTab />;
    case tabNames.reference:
      return <Reference />;
    case tabNames.export:
      return <ExportTab handleExport={context.handleExport} />;
    case tabNames.settings:
      return <SettingsTab started={context.started} />;
    case tabNames.files:
      return <FilesTab />;
    default:
      return <WelcomeTab context={context} />;
  }
}

function PanelTab({ label, isSelected, onClick }) {
  return (
    <>
      <button
        onClick={onClick}
        className={cx(
          'h-10 px-2 text-sm border-t-2 border-t-transparent text-foreground cursor-pointer hover:opacity-50 flex items-center space-x-1 border-b-2',
          isSelected ? 'border-foreground' : 'border-transparent',
        )}
      >
        {label}
      </button>
    </>
  );
}
function Tabs({ className }) {
  const { isPanelOpen, activeFooter: tab } = useSettings();
  return (
    <div
      className={cx(
        'px-2 w-full flex select-none max-w-full h-10 max-h-10 min-h-10 overflow-auto items-center',
        className,
      )}
    >
      {Object.keys(tabNames).map((key) => {
        const val = tabNames[key];
        return <PanelTab key={key} isSelected={tab === val && isPanelOpen} label={key} onClick={() => setTab(val)} />;
      })}
    </div>
  );
}

export function PanelToggle({ isEmbedded, isZen }) {
  const { panelPosition, isPanelOpen } = useSettings();
  return (
    !isEmbedded &&
    !isZen &&
    panelPosition === 'right' && (
      <button
        title="menu"
        className={cx('border-l border-muted px-2 py-0 text-foreground hover:opacity-50')}
        onClick={() => setIsPanelOpened(!isPanelOpen)}
      >
        <Bars3Icon className="w-6 h-6" />
      </button>
    )
  );
}
