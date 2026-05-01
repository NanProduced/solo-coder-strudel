/*
security-sandbox.mjs - Sandbox for executing generated Strudel code safely
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

const DANGEROUS_PATTERNS = [
  {
    pattern: /\bfetch\s*\(/,
    name: 'fetch',
    severity: 'high',
    description: 'Network requests via fetch() are not allowed',
    suggestion: 'Use Strudel built-in samples and sounds instead',
  },
  {
    pattern: /\bXMLHttpRequest\b/,
    name: 'XMLHttpRequest',
    severity: 'high',
    description: 'Network requests via XMLHttpRequest are not allowed',
    suggestion: 'Use Strudel built-in samples and sounds instead',
  },
  {
    pattern: /\bimport\s*\(/,
    name: 'dynamic import',
    severity: 'high',
    description: 'Dynamic imports are not allowed',
    suggestion: 'Use Strudel built-in functions instead',
  },
  {
    pattern: /\bimport\s+[\w{}*]+\s+from/,
    name: 'import statement',
    severity: 'medium',
    description: 'Import statements are not executed in REPL context',
    suggestion: 'All Strudel functions are already available in the REPL',
  },
  {
    pattern: /\bdocument\s*\./,
    name: 'document API',
    severity: 'medium',
    description: 'Direct DOM manipulation via document API',
    suggestion: 'Use Strudel visualization functions like .pianoroll() instead',
  },
  {
    pattern: /\bwindow\s*\./,
    name: 'window API',
    severity: 'medium',
    description: 'Direct window API access',
    suggestion: 'Use Strudel built-in functions instead',
  },
  {
    pattern: /\blocalStorage\s*\./,
    name: 'localStorage',
    severity: 'low',
    description: 'localStorage access',
    suggestion: 'Consider using Strudel persistent settings via nanostores',
  },
  {
    pattern: /\bsessionStorage\s*\./,
    name: 'sessionStorage',
    severity: 'low',
    description: 'sessionStorage access',
    suggestion: 'Not typically needed for Strudel patterns',
  },
  {
    pattern: /\bindexedDB\b/,
    name: 'indexedDB',
    severity: 'medium',
    description: 'indexedDB access',
    suggestion: 'Not typically needed for Strudel patterns',
  },
  {
    pattern: /\bcrypto\s*\./,
    name: 'crypto API',
    severity: 'medium',
    description: 'Crypto API access',
    suggestion: 'Use Strudel rand functions instead: rand, perlin, sine, etc.',
  },
  {
    pattern: /\bsetTimeout\s*\(/,
    name: 'setTimeout',
    severity: 'low',
    description: 'setTimeout usage',
    suggestion: 'Use Strudel timing functions: .early(), .late(), .fast(), .slow()',
  },
  {
    pattern: /\bsetInterval\s*\(/,
    name: 'setInterval',
    severity: 'low',
    description: 'setInterval usage',
    suggestion: 'Use Strudel pattern functions instead of manual intervals',
  },
  {
    pattern: /\bnavigator\s*\./,
    name: 'navigator API',
    severity: 'medium',
    description: 'Navigator API access',
    suggestion: 'Not typically needed for Strudel patterns',
  },
  {
    pattern: /\blocation\s*\./,
    name: 'location API',
    severity: 'high',
    description: 'Location API access could enable redirects',
    suggestion: 'Not allowed for security reasons',
  },
  {
    pattern: /\bhistory\s*\./,
    name: 'history API',
    severity: 'medium',
    description: 'History API access',
    suggestion: 'Not typically needed for Strudel patterns',
  },
  {
    pattern: /\bWebSocket\s*\(/,
    name: 'WebSocket',
    severity: 'high',
    description: 'WebSocket connections not allowed',
    suggestion: 'Use Strudel built-in samples and sounds',
  },
  {
    pattern: /\bWorker\s*\(/,
    name: 'Web Worker',
    severity: 'medium',
    description: 'Web Worker creation not recommended',
    suggestion: 'Use Strudel built-in functions instead',
  },
];

const SAFE_SAMPLES_PATTERNS = [
  /samples\s*\(\s*['"`]?github:/,
  /samples\s*\(\s*['"`]?https?:\/\/.*freesound\.org/,
  /samples\s*\(\s*['"`]?https?:\/\/.*loophole-letters\.vercel\.app/,
  /loadSample\s*\(\s*['"`]?https?:\/\/.*freesound\.org/,
  /loadSample\s*\(\s*['"`]?https?:\/\/.*loophole-letters\.vercel\.app/,
];

const ALLOWED_EXTERNAL_DOMAINS = [
  'freesound.org',
  'loophole-letters.vercel.app',
  'cdn.freesound.org',
];

function isSafeExternalUrl(url) {
  try {
    const urlObj = new URL(url);
    return ALLOWED_EXTERNAL_DOMAINS.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

export function scanCodeForDangerousPatterns(code) {
  const issues = [];

  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.pattern.test(code)) {
      issues.push({
        ...dangerous,
        pattern: undefined,
      });
    }
  }

  const urlPattern = /['"`](https?:\/\/[^'"`]+)['"`]/g;
  let urlMatch;
  while ((urlMatch = urlPattern.exec(code)) !== null) {
    const url = urlMatch[1];
    if (!isSafeExternalUrl(url)) {
      const inSafeContext = SAFE_SAMPLES_PATTERNS.some(pattern => {
        const context = code.slice(Math.max(0, urlMatch.index - 100), urlMatch.index + urlMatch[0].length + 100);
        return pattern.test(context);
      });
      
      if (!inSafeContext) {
        issues.push({
          name: 'external URL',
          severity: 'medium',
          description: `External URL detected: ${url}`,
          suggestion: 'Only freesound.org and loophole-letters URLs are allowed for samples',
        });
      }
    }
  }

  return {
    isSafe: issues.filter(i => i.severity === 'high').length === 0,
    issues,
  };
}

export function formatSecurityIssues(scanResult) {
  if (scanResult.isSafe && scanResult.issues.length === 0) {
    return 'Code passed security scan.';
  }

  const lines = ['Security scan results:'];

  const highIssues = scanResult.issues.filter(i => i.severity === 'high');
  const mediumIssues = scanResult.issues.filter(i => i.severity === 'medium');
  const lowIssues = scanResult.issues.filter(i => i.severity === 'low');

  if (highIssues.length > 0) {
    lines.push('', '🚨 High Severity Issues (Blocked):');
    for (const issue of highIssues) {
      lines.push(`  - ${issue.name}: ${issue.description}`);
      lines.push(`    Suggestion: ${issue.suggestion}`);
    }
  }

  if (mediumIssues.length > 0) {
    lines.push('', '⚠️ Medium Severity Issues:');
    for (const issue of mediumIssues) {
      lines.push(`  - ${issue.name}: ${issue.description}`);
      lines.push(`    Suggestion: ${issue.suggestion}`);
    }
  }

  if (lowIssues.length > 0) {
    lines.push('', 'ℹ️ Low Severity Issues:');
    for (const issue of lowIssues) {
      lines.push(`  - ${issue.name}: ${issue.description}`);
      lines.push(`    Suggestion: ${issue.suggestion}`);
    }
  }

  if (!scanResult.isSafe) {
    lines.push('', '❌ Code contains high-severity security issues and will not be executed.');
  }

  return lines.join('\n');
}

export function validateCodeSecurity(code) {
  const scanResult = scanCodeForDangerousPatterns(code);
  
  return {
    ...scanResult,
    summary: formatSecurityIssues(scanResult),
  };
}

export function createSecurityErrorMessage(validation, security) {
  const messages = [];

  if (!validation.isValid) {
    messages.push('Validation Errors:');
    for (const error of validation.errors) {
      messages.push(`  - ${error.message}`);
    }
  }

  if (!security.isSafe) {
    messages.push('\nSecurity Issues:');
    const highIssues = security.issues.filter(i => i.severity === 'high');
    for (const issue of highIssues) {
      messages.push(`  - [${issue.severity}] ${issue.name}: ${issue.description}`);
    }
  }

  return messages.join('\n');
}

export function getRetryPrompt(validation, security) {
  const errorDetails = [];

  if (!validation.isValid) {
    errorDetails.push('The code has syntax errors:');
    for (const error of validation.errors) {
      errorDetails.push(`- ${error.message}`);
      if (error.line) {
        errorDetails.push(`  (Line ${error.line})`);
      }
    }
  }

  if (!security.isSafe) {
    errorDetails.push('The code has security issues:');
    const highIssues = security.issues.filter(i => i.severity === 'high');
    for (const issue of highIssues) {
      errorDetails.push(`- ${issue.name}: ${issue.description}`);
      errorDetails.push(`  Suggestion: ${issue.suggestion}`);
    }
  }

  if (validation.warnings.length > 0 || security.issues.filter(i => i.severity !== 'high').length > 0) {
    errorDetails.push('\nWarnings (you can ignore these if you know what you are doing):');
    
    for (const warning of validation.warnings) {
      errorDetails.push(`- ${warning.message}`);
    }
    
    const nonHighIssues = security.issues.filter(i => i.severity !== 'high');
    for (const issue of nonHighIssues) {
      errorDetails.push(`- [${issue.severity}] ${issue.name}: ${issue.description}`);
    }
  }

  return `Please fix the following issues and regenerate the code:

${errorDetails.join('\n')}

IMPORTANT: 
- Do NOT use fetch, XMLHttpRequest, import(), document, window, location, or WebSocket
- Use only Strudel built-in functions for patterns, sounds, and effects
- All Strudel functions are already available in the REPL context
- Keep the code simple and focused on musical patterns`;
}
