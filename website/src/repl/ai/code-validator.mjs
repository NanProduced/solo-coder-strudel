/*
code-validator.mjs - Validate generated Strudel code
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import { parse } from 'acorn';
import { mini2ast } from '@strudel/mini';

export function validateJavaScript(code) {
  const errors = [];
  const warnings = [];

  try {
    parse(code, {
      ecmaVersion: 2022,
      allowAwaitOutsideFunction: true,
      locations: true,
    });
  } catch (err) {
    errors.push({
      type: 'syntax',
      message: err.message,
      line: err.loc?.line,
      column: err.loc?.column,
    });
  }

  const suspiciousPatterns = [
    { pattern: /document\s*\./, message: 'Usage of document API detected - this may not work as expected in Strudel' },
    { pattern: /window\s*\./, message: 'Usage of window API detected - this may not work as expected in Strudel' },
    { pattern: /localStorage\s*\./, message: 'Usage of localStorage detected - consider using persistentAtom from nanostores instead' },
  ];

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(code)) {
      warnings.push({
        type: 'suspicious',
        message,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateMiniNotation(code) {
  const errors = [];
  const warnings = [];

  const stringPattern = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;
  let match;

  while ((match = stringPattern.exec(code)) !== null) {
    const quoteType = match[1];
    const stringContent = match[0].slice(1, -1);
    
    if (quoteType === '`') continue;

    const hasEscapes = stringContent.includes('\\');
    if (hasEscapes && !stringContent.includes('\\n') && !stringContent.includes('\\t')) {
      continue;
    }

    try {
      mini2ast(`"${stringContent}"`);
    } catch (err) {
      const line = code.slice(0, match.index).split('\n').length;
      errors.push({
        type: 'mini-notation',
        message: `Mini notation parse error: ${err.message}`,
        line,
        context: stringContent,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateStrudelCode(code) {
  const jsValidation = validateJavaScript(code);
  const miniValidation = validateMiniNotation(code);

  const allErrors = [...jsValidation.errors, ...miniValidation.errors];
  const allWarnings = [...jsValidation.warnings, ...miniValidation.warnings];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    jsValidation,
    miniValidation,
  };
}

export function formatValidationErrors(validation) {
  if (validation.isValid) {
    return 'Code is valid!';
  }

  const lines = ['Validation failed:'];

  for (const error of validation.errors) {
    let line = `  - ${error.message}`;
    if (error.line) {
      line = `  Line ${error.line}: ${error.message}`;
    }
    if (error.context) {
      line += ` (context: "${error.context}")`;
    }
    lines.push(line);
  }

  if (validation.warnings.length > 0) {
    lines.push('', 'Warnings:');
    for (const warning of validation.warnings) {
      lines.push(`  - ${warning.message}`);
    }
  }

  return lines.join('\n');
}

export function extractCodeFromMarkdown(text) {
  const codeBlockPattern = /```(?:javascript|js)?\s*([\s\S]*?)```/g;
  const inlineCodePattern = /`([^`]+)`/g;

  let match;
  const codeBlocks = [];

  while ((match = codeBlockPattern.exec(text)) !== null) {
    codeBlocks.push(match[1].trim());
  }

  if (codeBlocks.length > 0) {
    return codeBlocks.join('\n\n');
  }

  const inlineMatches = [];
  while ((match = inlineCodePattern.exec(text)) !== null) {
    inlineMatches.push(match[1].trim());
  }

  if (inlineMatches.length > 0) {
    return inlineMatches.join('\n');
  }

  return text.trim();
}

export function cleanGeneratedCode(code) {
  let cleaned = code;

  cleaned = cleaned.replace(/^Here['’]?s (?:the )?code:?\s*/i, '');
  cleaned = cleaned.replace(/^Sure[,.!]?\s*/i, '');
  cleaned = cleaned.replace(/^Certainly[,.!]?\s*/i, '');
  cleaned = cleaned.replace(/^Let me (?:create|write|generate)[^:]*:\s*/i, '');

  cleaned = extractCodeFromMarkdown(cleaned);

  cleaned = cleaned
    .split('\n')
    .filter((line) => {
      if (line.trim().startsWith('//')) return true;
      if (line.trim().startsWith('/*')) return true;
      if (line.trim().startsWith('*')) return true;
      if (line.trim().startsWith('```')) return false;
      return true;
    })
    .join('\n');

  return cleaned.trim();
}

export function validateAndCleanCode(code) {
  const cleaned = cleanGeneratedCode(code);
  const validation = validateStrudelCode(cleaned);

  return {
    code: cleaned,
    validation,
  };
}
