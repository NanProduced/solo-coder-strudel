/*
AIPanel.jsx - AI Panel for Strudel REPL
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { useState, useEffect, useRef, useCallback } from 'react';
import cx from '@src/cx.mjs';
import {
  getAIConfig,
  setAIConfig,
  resetAIConfig,
  validateAIConfig,
  getConfigStatus,
  generateCode,
  modifyCode,
  formatValidationErrors,
  formatSecurityIssues,
} from '../../../repl/ai/index.mjs';
import { useSettings, settingsMap } from '@src/settings.mjs';

const inputClass =
  'bg-background text-xs h-8 border border-box rounded-0 text-foreground border-muted placeholder-muted focus:outline-none focus:ring-0 focus:border-foreground';

function FormItem({ label, children, sublabel }) {
  return (
    <div className="grid gap-2 text-xs">
      <label className="text-sm">{label}</label>
      {sublabel && <span className="text-xs text-muted">{sublabel}</span>}
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder, type = 'text', sublabel }) {
  return (
    <FormItem label={label} sublabel={sublabel}>
      <input
        type={type}
        className={cx('px-2 grow', inputClass)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </FormItem>
  );
}

function ConfigPanel({ onSave, onCancel }) {
  const [config, setConfig] = useState(() => getAIConfig());
  const [validation, setValidation] = useState(null);
  const { fontFamily } = useSettings();

  const handleSave = () => {
    const val = validateAIConfig(config);
    if (val.isValid) {
      setAIConfig(config);
      onSave?.();
    } else {
      setValidation(val);
    }
  };

  const handleReset = () => {
    resetAIConfig();
    setConfig(getAIConfig());
    setValidation(null);
  };

  return (
    <div className="p-4 space-y-4 text-foreground" style={{ fontFamily }}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Settings</h3>
        <button
          onClick={onCancel}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Back
        </button>
      </div>

      <p className="text-sm text-muted">
        Configure your AI provider (OpenAI compatible API). Your API key is stored locally in your browser.
      </p>

      <TextInput
        label="API Base URL"
        sublabel="e.g., https://api.openai.com/v1"
        value={config.baseUrl}
        onChange={(v) => setConfig({ ...config, baseUrl: v })}
        placeholder="https://api.openai.com/v1"
      />

      <TextInput
        label="API Key"
        sublabel="Your API key for the provider"
        value={config.apiKey}
        onChange={(v) => setConfig({ ...config, apiKey: v })}
        placeholder="sk-..."
        type="password"
      />

      <TextInput
        label="Model Name"
        sublabel="e.g., gpt-4o, claude-3-sonnet, etc."
        value={config.modelName}
        onChange={(v) => setConfig({ ...config, modelName: v })}
        placeholder="gpt-4o"
      />

      <div className="grid grid-cols-2 gap-4">
        <TextInput
          label="Temperature"
          sublabel="0.0 - 2.0"
          value={config.temperature}
          onChange={(v) => setConfig({ ...config, temperature: parseFloat(v) || 0.7 })}
          type="number"
          placeholder="0.7"
        />
        <TextInput
          label="Max Tokens"
          sublabel="Maximum response length"
          value={config.maxTokens}
          onChange={(v) => setConfig({ ...config, maxTokens: parseInt(v) || 2048 })}
          type="number"
          placeholder="2048"
        />
      </div>

      {validation && !validation.isValid && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
          <p className="text-red-400 text-sm font-medium">Validation errors:</p>
          <ul className="text-red-400 text-sm mt-1 list-disc list-inside">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-foreground text-background hover:opacity-80 text-sm font-medium"
        >
          Save Settings
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 border border-muted text-sm hover:border-foreground"
        >
          Reset to Defaults
        </button>
      </div>

      <div className="pt-4 border-t border-muted">
        <h4 className="text-sm font-medium mb-2">Quick Config Presets</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setConfig({ ...config, baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o' })}
            className="px-3 py-1 text-xs border border-muted hover:border-foreground"
          >
            OpenAI (GPT-4o)
          </button>
          <button
            onClick={() => setConfig({ ...config, baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini' })}
            className="px-3 py-1 text-xs border border-muted hover:border-foreground"
          >
            OpenAI (GPT-4o Mini)
          </button>
          <button
            onClick={() => setConfig({ ...config, baseUrl: 'https://openrouter.ai/api/v1', modelName: 'anthropic/claude-3-5-sonnet-20241022' })}
            className="px-3 py-1 text-xs border border-muted hover:border-foreground"
          >
            OpenRouter (Claude)
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content, code, onCopy, onInsert, onPlay, isLoading }) {
  const { fontFamily } = useSettings();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isUser = role === 'user';
  const isSystem = role === 'system';
  const isError = role === 'error';

  if (isSystem) return null;

  return (
    <div className={cx(
      'flex flex-col gap-2',
      !isUser && 'bg-background/50 p-3 rounded',
    )}>
      <div className="flex items-center gap-2">
        <span className={cx(
          'text-xs font-medium',
          isUser ? 'text-foreground' : 'text-muted',
          isError && 'text-red-400',
        )}>
          {isUser ? 'You' : isError ? 'Error' : 'AI'}
        </span>
        {isLoading && <span className="text-xs text-muted animate-pulse">Generating...</span>}
      </div>

      {!isLoading && content && (
        <p className="text-sm text-foreground whitespace-pre-wrap" style={{ fontFamily }}>
          {content}
        </p>
      )}

      {!isLoading && code && (
        <div className="mt-2">
          <pre
            className="p-3 bg-background border border-muted rounded text-xs overflow-x-auto"
            style={{ fontFamily }}
          >
            <code>{code}</code>
          </pre>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onInsert}
              className="px-3 py-1.5 text-xs border border-muted hover:border-foreground hover:bg-foreground hover:text-background transition-colors"
            >
              Insert
            </button>
            <button
              onClick={onPlay}
              className="px-3 py-1.5 text-xs bg-foreground text-background hover:opacity-80 transition-opacity"
            >
              ▶ Play Now
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs border border-muted hover:border-foreground transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-muted">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-xs">Generating code...</span>
        </div>
      )}
    </div>
  );
}

function ChatPanel({ context }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState(() => getConfigStatus());
  const [progress, setProgress] = useState(null);
  const messagesEndRef = useRef(null);
  const { fontFamily } = useSettings();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    setConfigStatus(getConfigStatus());
  }, [showConfig]);

  const handleGenerate = useCallback(async (userInput, currentCode = null, isModify = false) => {
    if (!userInput.trim() || isLoading) return;

    setIsLoading(true);
    setProgress(null);

    const userMessage = {
      role: 'user',
      content: userInput,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const result = await generateCode(userInput, {
        currentCode,
        isModify,
        onProgress: (p) => setProgress(p),
      });

      if (result.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: isModify ? 'Here\'s your modified code:' : 'Here\'s your Strudel pattern:',
          code: result.code,
          validation: result.validation,
          security: result.security,
          attempts: result.attempts,
        }]);
      } else {
        let errorContent = 'Failed to generate valid code after multiple attempts.\n\n';
        
        if (result.validation && !result.validation.isValid) {
          errorContent += `Validation Errors:\n${formatValidationErrors(result.validation)}\n\n`;
        }
        
        if (result.security && !result.security.isSafe) {
          errorContent += `Security Issues:\n${formatSecurityIssues(result.security)}`;
        }

        setMessages(prev => [...prev, {
          role: 'error',
          content: errorContent,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: `Error: ${error.message}\n\nPlease check your AI settings and try again.`,
      }]);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [isLoading]);

  const handleInsert = (code) => {
    if (context?.editorRef?.current?.setCode) {
      context.editorRef.current.setCode(code);
    }
  };

  const handlePlay = (code) => {
    if (context?.editorRef?.current?.setCode) {
      context.editorRef.current.setCode(code);
      if (context.started) {
        context.handleEvaluate();
      } else {
        context.handleTogglePlay();
      }
    }
  };

  const handleUseCurrentCode = () => {
    if (context?.activeCode) {
      setInput('Based on this code, make the following change: ');
    }
  };

  const suggestedPrompts = [
    'a simple 4/4 drum beat',
    'a happy melody in C major',
    'a bassline with some funk',
    'ambient pads with reverb',
  ];

  if (showConfig) {
    return (
      <ConfigPanel
        onSave={() => {
          setShowConfig(false);
          setConfigStatus(getConfigStatus());
        }}
        onCancel={() => setShowConfig(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full text-foreground" style={{ fontFamily }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-muted shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">AI Composer</span>
          {configStatus.configured ? (
            <span className="text-xs text-green-500">● Connected</span>
          ) : (
            <span className="text-xs text-amber-500">○ Not configured</span>
          )}
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="text-xs text-muted hover:text-foreground"
        >
          ⚙ Settings
        </button>
      </div>

      {!configStatus.configured && (
        <div className="p-4 mx-4 mt-4 bg-amber-500/10 border border-amber-500/30 rounded">
          <p className="text-sm text-amber-400 mb-2">
            ⚠️ AI not configured
          </p>
          <p className="text-xs text-muted mb-3">
            Please configure your AI provider settings to use this feature.
          </p>
          <button
            onClick={() => setShowConfig(true)}
            className="px-4 py-2 text-sm bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30"
          >
            Configure AI Settings
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && configStatus.configured && (
          <div className="text-center py-8">
            <p className="text-muted text-sm mb-4">
              Describe the music you want to create.
            </p>
            <p className="text-xs text-muted mb-6">
              Try: "a jazzy drum beat with a walking bassline"
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="px-3 py-1.5 text-xs border border-muted hover:border-foreground hover:bg-foreground hover:text-background transition-colors rounded"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            code={msg.code}
            onCopy={() => msg.code && navigator.clipboard.writeText(msg.code)}
            onInsert={() => msg.code && handleInsert(msg.code)}
            onPlay={() => msg.code && handlePlay(msg.code)}
          />
        ))}

        {isLoading && (
          <MessageBubble
            role="assistant"
            isLoading={true}
            onCopy={() => {}}
            onInsert={() => {}}
            onPlay={() => {}}
          />
        )}

        {progress && (
          <div className="text-xs text-muted text-center">
            Attempt {progress.attempt}/{progress.maxAttempts}
            {progress.type === 'validating' && ' - Validating code...'}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {messages.length > 0 && configStatus.configured && (
        <div className="px-4 py-2 border-t border-muted shrink-0">
          <div className="flex gap-2">
            {context?.activeCode && (
              <button
                onClick={handleUseCurrentCode}
                className="px-2 py-1 text-xs border border-muted hover:border-foreground rounded"
              >
                📝 Modify current code
              </button>
            )}
            <button
              onClick={() => setMessages([])}
              className="px-2 py-1 text-xs border border-muted hover:border-foreground rounded"
            >
              🗑 Clear chat
            </button>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-muted shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate(input, context?.activeCode, input.includes('modify') || input.includes('change') || messages.length > 0);
              }
            }}
            placeholder={configStatus.configured 
              ? "Describe your music... (Enter to send, Shift+Enter for new line)"
              : "Configure AI settings first..."
            }
            className={cx(
              'flex-1 p-3 text-sm bg-background border border-muted rounded resize-none',
              'focus:outline-none focus:border-foreground placeholder-muted',
              !configStatus.configured && 'opacity-50 cursor-not-allowed'
            )}
            disabled={!configStatus.configured || isLoading}
            rows={2}
            style={{ fontFamily }}
          />
          <button
            onClick={() => handleGenerate(input, context?.activeCode, input.includes('modify') || input.includes('change') || messages.length > 0)}
            disabled={!configStatus.configured || isLoading || !input.trim()}
            className={cx(
              'px-4 py-2 text-sm bg-foreground text-background rounded',
              'disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity'
            )}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          💡 Tip: You can ask to modify generated code. For example: "Make the hi-hat more dense" or "Change the bass to be deeper".
        </p>
      </div>
    </div>
  );
}

export function AIPanel({ context }) {
  return <ChatPanel context={context} />;
}
