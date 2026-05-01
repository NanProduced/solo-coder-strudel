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
  if (!isModify || !currentCode) {
    return userInput;
  }

  return generateIncrementalModifyPrompt(currentCode, userInput);
}

function generateIncrementalModifyPrompt(originalCode, modificationRequest) {
  const requestLower = modificationRequest.toLowerCase();
  
  const hasHiHatKeywords = requestLower.includes('hi-hat') || 
                           requestLower.includes('hihat') || 
                           requestLower.includes('hh') ||
                           requestLower.includes('hat');
  
  const hasDrumKeywords = requestLower.includes('drum') || 
                          requestLower.includes('kick') || 
                          requestLower.includes('snare') ||
                          requestLower.includes('bd') ||
                          requestLower.includes('sd') ||
                          requestLower.includes('percussion');
  
  const hasBassKeywords = requestLower.includes('bass');
  
  const hasMelodyKeywords = requestLower.includes('melody') || 
                            requestLower.includes('lead') ||
                            requestLower.includes('note');
  
  const hasEffectKeywords = requestLower.includes('delay') || 
                            requestLower.includes('reverb') ||
                            requestLower.includes('filter') ||
                            requestLower.includes('effect') ||
                            requestLower.includes('lpf') ||
                            requestLower.includes('echo');
  
  const hasTempoKeywords = requestLower.includes('tempo') || 
                            requestLower.includes('speed') ||
                            requestLower.includes('fast') ||
                            requestLower.includes('slow') ||
                            requestLower.includes('cps');

  let focusHint = '';
  if (hasHiHatKeywords) {
    focusHint = 'FOCUS EXCLUSIVELY on the HI-HAT pattern. Look for lines containing "hh", "hi-hat", or hi-hat related sounds. DO NOT change kick, snare, bass, melody, or any other parts.';
  } else if (hasDrumKeywords && !hasBassKeywords && !hasMelodyKeywords) {
    focusHint = 'FOCUS EXCLUSIVELY on the DRUM patterns (kick, snare, hi-hat, percussion). DO NOT change bass, melody, chords, or effects unless specifically mentioned.';
  } else if (hasBassKeywords && !hasDrumKeywords && !hasMelodyKeywords) {
    focusHint = 'FOCUS EXCLUSIVELY on the BASS line/pattern. DO NOT change drums, melody, chords, or effects unless specifically mentioned.';
  } else if (hasMelodyKeywords && !hasDrumKeywords && !hasBassKeywords) {
    focusHint = 'FOCUS EXCLUSIVELY on the MELODY or LEAD line. DO NOT change drums, bass, chords, or effects unless specifically mentioned.';
  } else if (hasEffectKeywords && !hasDrumKeywords && !hasBassKeywords && !hasMelodyKeywords) {
    focusHint = 'FOCUS EXCLUSIVELY on the EFFECTS parameters (delay, reverb, filter, etc.). DO NOT change the core musical patterns unless specifically mentioned.';
  } else if (hasTempoKeywords) {
    focusHint = 'FOCUS EXCLUSIVELY on tempo/speed changes (setcps, fast, slow). DO NOT change the musical patterns themselves.';
  } else {
    focusHint = 'Identify which parts of the code relate to the request. ONLY modify those specific parts.';
  }

  const codeBlocks = analyzeCodeStructure(originalCode);
  
  let structureHint = '';
  if (codeBlocks.usesLabels) {
    structureHint = `
The code uses LABEL-BASED EVALUATION (\`$: \` prefix). Each \`$: \` block is independent.

Analyzed structure:
${codeBlocks.labels.map((label, idx) => `  Block ${idx + 1}: ${label.description || 'Pattern'}`).join('\n')}

When modifying:
- If request is about drums, find and modify ONLY the drum-related \`$: \` block(s)
- If request is about bass, find and modify ONLY the bass-related \`$: \` block(s)
- If request is about melody, find and modify ONLY the melody-related \`$: \` block(s)
- LEAVE ALL OTHER BLOCKS COMPLETELY UNCHANGED`;
  } else {
    structureHint = `
The code uses a single pattern (likely with stack() for layers).

When modifying:
- Identify which layer(s) of stack() relate to the request
- Modify ONLY those layers
- LEAVE ALL OTHER LAYERS COMPLETELY UNCHANGED`;
  }

  return `## CRITICAL INSTRUCTIONS FOR MODIFICATION

YOU MUST READ AND FOLLOW THESE RULES EXACTLY.

### PRIMARY RULE
**${focusHint}**

### CODE STRUCTURE ANALYSIS
${structureHint}

### ORIGINAL CODE
\`\`\`javascript
${originalCode}
\`\`\`

### MODIFICATION REQUEST
${modificationRequest}

### STRICT MODIFICATION GUIDELINES

1. **DO NOT REWRITE THE ENTIRE CODE** - Make surgical changes only to the relevant parts
2. **PRESERVE ALL UNRELATED CODE** - If a line/block doesn't relate to the request, leave it EXACTLY as is
3. **USE LABEL CONTEXT** - If the original uses \`$: \`, keep each block separate and only modify the relevant block(s)
4. **PRESERVE COMMENTS** - Keep all original comments unless they become obsolete
5. **PRESERVE VARIABLES** - Keep all variable names, function definitions, and structure intact

### EXAMPLE OF CORRECT MODIFICATION

If original is:
\`\`\`javascript
$: s("bd sd bd sd")  // kick and snare
$: s("hh*4")          // hi-hat - 4 per cycle
$: note("c3")         // bass
\`\`\`

And request is "hi-hat more dense":

CORRECT output (ONLY hi-hat line changed):
\`\`\`javascript
$: s("bd sd bd sd")  // kick and snare
$: s("hh*8")          // hi-hat - doubled to 8 per cycle
$: note("c3")         // bass
\`\`\`

WRONG output (entire code rewritten with changes):
\`\`\`javascript
// New drum pattern
$: s("bd sd bd sd")
$: s("hh*8")
$: note("c3").lpf(400)  // WRONG: added lpf that wasn't requested
\`\`\`

### OUTPUT FORMAT

Respond with ONLY the complete modified code in a \`\`\`javascript code block.
- Include ALL lines from the original code
- ONLY change the specific parts related to the request
- Do NOT add explanatory text outside the code block
- Use comments inside the code ONLY to explain your changes if necessary
`;
}

function analyzeCodeStructure(code) {
  const lines = code.split('\n');
  const labels = [];
  let usesLabels = false;
  
  let currentLabel = null;
  let currentContent = [];
  
  for (const line of lines) {
    if (line.trim().startsWith('$:')) {
      usesLabels = true;
      if (currentLabel) {
        labels.push({
          content: currentContent.join('\n'),
          description: inferLabelDescription(currentContent.join('\n')),
        });
      }
      currentLabel = line;
      currentContent = [line];
    } else if (currentLabel) {
      currentContent.push(line);
    }
  }
  
  if (currentLabel) {
    labels.push({
      content: currentContent.join('\n'),
      description: inferLabelDescription(currentContent.join('\n')),
    });
  }
  
  return { usesLabels, labels };
}

function inferLabelDescription(content) {
  const lower = content.toLowerCase();
  
  if (lower.includes('bd') || lower.includes('kick') || lower.includes('sd') || lower.includes('snare') || lower.includes('hh') || lower.includes('hi-hat')) {
    if (lower.includes('hh') || lower.includes('hi-hat')) {
      return 'Drums (hi-hat pattern)';
    }
    return 'Drums (kick/snare pattern)';
  }
  if (lower.includes('bass') || lower.includes('c2') || lower.includes('d2') || lower.includes('e2') || lower.includes('f2') || lower.includes('g2') || lower.includes('a2') || lower.includes('b2')) {
    return 'Bass line';
  }
  if (lower.includes('note') || lower.includes('melody') || lower.includes('scale') || lower.includes('chord')) {
    if (lower.includes('chord')) {
      return 'Chords / Harmony';
    }
    return 'Melody / Lead';
  }
  if (lower.includes('delay') || lower.includes('reverb') || lower.includes('effect')) {
    return 'Effects layer';
  }
  
  return 'Pattern layer';
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
