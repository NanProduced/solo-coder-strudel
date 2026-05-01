import * as krill from '@strudel/mini/krill-parser.js';
import { mini2ast, patternifyAST } from '@strudel/mini';

export function parseMiniNotation(code) {
  try {
    const wrappedCode = `"${code}"`;
    return mini2ast(wrappedCode);
  } catch (error) {
    return null;
  }
}

export function hasSyntaxType(ast, syntaxType) {
  if (!ast) return false;
  
  const found = { value: false };
  
  function traverse(node) {
    if (found.value) return;
    
    switch (syntaxType) {
      case 'group':
        if (node.type_ === 'pattern' && node.source_ && node.source_.length > 0) {
          if (node.arguments_.alignment === undefined || node.arguments_.alignment === 'fastcat') {
            if (node.source_.length > 1) {
              for (const child of node.source_) {
                if (child.type_ === 'pattern' && child.source_.length > 1) {
                  found.value = true;
                  return;
                }
              }
            }
          }
        }
        break;
        
      case 'fast':
      case 'stretch':
        if (node.options_?.ops) {
          for (const op of node.options_.ops) {
            if (op.type_ === 'stretch' && op.arguments_.type === 'fast') {
              found.value = true;
              return;
            }
          }
        }
        break;
        
      case 'slowcat':
      case 'alternation':
        if (node.type_ === 'pattern' && node.arguments_.alignment === 'polymeter_slowcat') {
          found.value = true;
          return;
        }
        break;
        
      case 'stack':
        if (node.type_ === 'pattern' && node.arguments_.alignment === 'stack') {
          found.value = true;
          return;
        }
        break;
        
      case 'sequence':
        if (node.type_ === 'pattern' && 
            (node.arguments_.alignment === undefined || 
             node.arguments_.alignment === 'fastcat')) {
          if (node.source_ && node.source_.length > 1) {
            const hasComplexChildren = node.source_.some(child => 
              child.type_ === 'pattern' && child.source_.length > 1
            );
            if (!hasComplexChildren) {
              found.value = true;
              return;
            }
          }
        }
        break;
        
      case 'complex':
        const hasGroup = checkForGroup(node);
        const hasFast = checkForFast(node);
        const hasStack = checkForStack(node);
        if ((hasGroup && hasFast) || (hasGroup && hasStack) || (hasFast && hasStack)) {
          found.value = true;
          return;
        }
        break;
    }
    
    if (node.source_ && Array.isArray(node.source_)) {
      for (const child of node.source_) {
        traverse(child);
      }
    }
  }
  
  traverse(ast);
  return found.value;
}

function checkForGroup(node) {
  if (!node) return false;
  
  if (node.type_ === 'pattern' && node.source_ && node.source_.length > 0) {
    if (node.arguments_.alignment === undefined || node.arguments_.alignment === 'fastcat') {
      if (node.source_.length > 1) {
        for (const child of node.source_) {
          if (child.type_ === 'pattern' && child.source_.length > 1) {
            return true;
          }
        }
      }
    }
  }
  
  if (node.source_ && Array.isArray(node.source_)) {
    for (const child of node.source_) {
      if (checkForGroup(child)) return true;
    }
  }
  
  return false;
}

function checkForFast(node) {
  if (!node) return false;
  
  if (node.options_?.ops) {
    for (const op of node.options_.ops) {
      if (op.type_ === 'stretch' && op.arguments_.type === 'fast') {
        return true;
      }
    }
  }
  
  if (node.source_ && Array.isArray(node.source_)) {
    for (const child of node.source_) {
      if (checkForFast(child)) return true;
    }
  }
  
  return false;
}

function checkForStack(node) {
  if (!node) return false;
  
  if (node.type_ === 'pattern' && node.arguments_.alignment === 'stack') {
    return true;
  }
  
  if (node.source_ && Array.isArray(node.source_)) {
    for (const child of node.source_) {
      if (checkForStack(child)) return true;
    }
  }
  
  return false;
}

export function validateAnswer(userCode, expectedSyntax) {
  const ast = parseMiniNotation(userCode);
  
  if (!ast) {
    return {
      valid: false,
      error: 'Syntax error in mini notation',
    };
  }
  
  const hasSyntax = hasSyntaxType(ast, expectedSyntax);
  
  return {
    valid: hasSyntax,
    ast,
  };
}

export function getSyntaxElements(ast) {
  if (!ast) return [];
  
  const elements = [];
  
  function traverse(node, parentRange = null) {
    if (!node) return;
    
    const element = {
      type: node.type_,
      alignment: node.arguments_?.alignment,
      location: node.location_,
      ops: node.options_?.ops || [],
    };
    
    if (node.type_ === 'pattern') {
      if (node.arguments_.alignment === 'stack') {
        element.syntaxType = 'stack';
        element.label = 'Stack';
        elements.push(element);
      } else if (node.arguments_.alignment === 'polymeter_slowcat') {
        element.syntaxType = 'slowcat';
        element.label = 'Slow Alternation';
        elements.push(element);
      } else if (node.source_ && node.source_.length > 1) {
        const hasNestedPatterns = node.source_.some(child => 
          child.type_ === 'pattern' && child.source_?.length > 1
        );
        if (hasNestedPatterns) {
          element.syntaxType = 'group';
          element.label = 'Group';
          elements.push(element);
        } else {
          element.syntaxType = 'sequence';
          element.label = 'Sequence';
          elements.push(element);
        }
      }
    }
    
    if (node.options_?.ops) {
      for (const op of node.options_.ops) {
        if (op.type_ === 'stretch') {
          elements.push({
            type: 'operator',
            syntaxType: op.arguments_.type === 'fast' ? 'fast' : 'slow',
            amount: op.arguments_.amount,
            label: op.arguments_.type === 'fast' ? 'Fast' : 'Slow',
            location: node.location_,
          });
        }
      }
    }
    
    if (node.source_ && Array.isArray(node.source_)) {
      for (const child of node.source_) {
        traverse(child, node.location_);
      }
    }
  }
  
  traverse(ast);
  return elements;
}

export const demoPatterns = {
  welcome: `note("c4 eb4 g4 c5")
  .s('sawtooth')
  .lpenv(4)
  .lpf(1000)
  .gain(0.3)
  .fast(2)`,
  
  lesson1: {
    example: 'note("c d e f")',
    pattern: 'note("{userCode}")',
  },
  
  lesson2: {
    example: 'note("[c d] e f")',
    pattern: 'note("{userCode}")',
  },
  
  lesson3: {
    example: 'note("c *2")',
    pattern: 'note("{userCode}")',
  },
  
  lesson4: {
    example: 'note("<c d> e")',
    pattern: 'note("{userCode}")',
  },
  
  lesson5: {
    example: 'note("c, e, g")',
    pattern: 'note("{userCode}")',
  },
  
  lesson6: {
    example: 'note("[c d] *2, e f")',
    pattern: 'note("{userCode}")',
  },
};

export function buildLessonPattern(userCode, lessonKey) {
  const lesson = demoPatterns[lessonKey];
  if (!lesson) {
    return `note("${userCode}")`;
  }
  return lesson.pattern.replace('{userCode}', userCode);
}
