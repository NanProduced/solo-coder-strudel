/*
ai-service.mjs - AI service for generating Strudel code
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { getAIConfig, validateAIConfig } from './ai-config.mjs';
import { generateSystemPrompt, getEssentialAPISummary } from './api-extractor.mjs';
import { selectRelevantExamples } from './example-selector.mjs';
import { validateAndCleanCode, formatValidationErrors } from './code-validator.mjs';
import { validateCodeSecurity, getRetryPrompt } from './security-sandbox.mjs';

export const MAX_RETRIES = 3;

export async function callAI(messages, config = null) {
  const cfg = config || getAIConfig();
  const validation = validateAIConfig(cfg);

  if (!validation.isValid) {
    throw new Error(`AI configuration invalid: ${validation.errors.join(', ')}`);
  }

  const baseUrl = cfg.baseUrl.endsWith('/') ? cfg.baseUrl.slice(0, -1) : cfg.baseUrl;
  const url = `${baseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.modelName,
      messages,
      temperature: cfg.temperature || 0.7,
      max_tokens: cfg.maxTokens || 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export function buildSystemPrompt(userInput, currentCode = null) {
  const apiSummary = getEssentialAPISummary();
  const examples = selectRelevantExamples(userInput, 5);
  return generateSystemPrompt(apiSummary, examples);
}

export function buildUserMessage(userInput, currentCode = null, isModify = false) {
  let message = userInput;

  if (isModify && currentCode) {
    message = `Current Strudel code:
\`\`\`javascript
${currentCode}
\`\`\`

Please modify this code according to the following request:
${userInput}

Important:
- Only make changes related to the request
- Keep other parts of the code intact
- If the request is about modifying a specific part (like "hi-hat more dense"), focus on that part only
- Return the complete modified code, not just the changes`;
  }

  return message;
}

export async function generateCode(userInput, options = {}) {
  const {
    currentCode = null,
    isModify = false,
    maxRetries = MAX_RETRIES,
    onProgress = null,
  } = options;

  const systemPrompt = buildSystemPrompt(userInput, currentCode);
  const userMessage = buildUserMessage(userInput, currentCode, isModify);

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  let lastError = null;
  let lastValidation = null;
  let lastSecurity = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (onProgress) {
      onProgress({
        type: 'generating',
        attempt: attempt + 1,
        maxAttempts: maxRetries,
      });
    }

    try {
      const rawResponse = await callAI(messages);
      
      if (onProgress) {
        onProgress({
          type: 'validating',
          attempt: attempt + 1,
          maxAttempts: maxRetries,
        });
      }

      const { code, validation } = validateAndCleanCode(rawResponse);
      const security = validateCodeSecurity(code);

      lastValidation = validation;
      lastSecurity = security;

      if (validation.isValid && security.isSafe) {
        return {
          code,
          validation,
          security,
          attempts: attempt + 1,
          success: true,
        };
      }

      const errorPrompt = getRetryPrompt(validation, security);
      messages.push({ role: 'assistant', content: rawResponse });
      messages.push({ role: 'user', content: errorPrompt });

      lastError = {
        validation,
        security,
        message: errorPrompt,
      };

    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      lastError = error;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  return {
    code: null,
    validation: lastValidation,
    security: lastSecurity,
    attempts: maxRetries,
    success: false,
    error: lastError,
  };
}

export async function modifyCode(currentCode, modificationRequest, options = {}) {
  return generateCode(modificationRequest, {
    ...options,
    currentCode,
    isModify: true,
  });
}

export class AICodeGenerator {
  constructor(options = {}) {
    this.config = options.config || null;
    this.conversationHistory = [];
  }

  setConfig(config) {
    this.config = config;
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  async generate(userInput, options = {}) {
    const result = await generateCode(userInput, {
      ...options,
      config: this.config,
    });

    if (result.success) {
      this.conversationHistory = [
        { role: 'user', content: userInput },
        { role: 'assistant', content: result.code },
      ];
    }

    return result;
  }

  async modify(currentCode, modificationRequest, options = {}) {
    const result = await modifyCode(currentCode, modificationRequest, {
      ...options,
      config: this.config,
    });

    if (result.success) {
      this.conversationHistory = [
        { role: 'user', content: `Modify: ${modificationRequest}` },
        { role: 'assistant', content: result.code },
      ];
    }

    return result;
  }
}

export function isConfigured() {
  const config = getAIConfig();
  return config.apiKey && config.baseUrl && config.modelName;
}

export function getConfigStatus() {
  const config = getAIConfig();
  const validation = validateAIConfig(config);
  
  return {
    configured: validation.isValid,
    hasApiKey: !!config.apiKey,
    hasBaseUrl: !!config.baseUrl,
    hasModel: !!config.modelName,
    baseUrl: config.baseUrl,
    modelName: config.modelName,
    errors: validation.errors,
  };
}
