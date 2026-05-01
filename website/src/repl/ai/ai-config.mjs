/*
ai-config.mjs - AI Provider Configuration for Strudel REPL
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { persistentAtom } from '@nanostores/persistent';

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  modelName: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 2048,
};

export const aiConfig = persistentAtom('ai-config', DEFAULT_CONFIG, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export function getAIConfig() {
  return aiConfig.get();
}

export function setAIConfig(config) {
  const current = aiConfig.get();
  aiConfig.set({ ...current, ...config });
}

export function resetAIConfig() {
  aiConfig.set({ ...DEFAULT_CONFIG });
}

export function validateAIConfig(config) {
  const errors = [];
  if (!config.baseUrl) {
    errors.push('Base URL is required');
  }
  if (!config.apiKey) {
    errors.push('API Key is required');
  }
  if (!config.modelName) {
    errors.push('Model name is required');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}
