/*
api-extractor.mjs - Extract API documentation from Strudel source files
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

const JSDOC_PATTERN = /\/\*\*([\s\S]*?)\*\/\s*(export\s+)?(const|let|var|function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;

function parseJSDoc(comment) {
  const result = {
    description: '',
    tags: [],
    params: [],
    returns: null,
    examples: [],
    synonyms: [],
  };

  const lines = comment.split('\n').map((l) => l.replace(/^\s*\*\s?/, '').trim());
  
  let currentTag = null;
  let currentValue = '';

  for (const line of lines) {
    if (!line) continue;

    const tagMatch = line.match(/^@(\w+)(?:\s+(.*))?$/);
    if (tagMatch) {
      if (currentTag) {
        processTag(result, currentTag, currentValue.trim());
      }
      currentTag = tagMatch[1];
      currentValue = tagMatch[2] || '';
    } else if (currentTag) {
      currentValue += ' ' + line;
    } else {
      result.description += (result.description ? ' ' : '') + line;
    }
  }

  if (currentTag) {
    processTag(result, currentTag, currentValue.trim());
  }

  return result;
}

function processTag(result, tag, value) {
  switch (tag) {
    case 'name':
      result.name = value;
      break;
    case 'tags':
      result.tags = value.split(/\s*,\s*/);
      break;
    case 'param':
      const paramMatch = value.match(/^\{([^}]+)\}\s+(\w+)(?:\s+(.*))?$/);
      if (paramMatch) {
        result.params.push({
          type: paramMatch[1],
          name: paramMatch[2],
          description: paramMatch[3] || '',
        });
      }
      break;
    case 'synonyms':
    case 'alias':
      result.synonyms = value.split(/\s*,\s*/);
      break;
    case 'example':
      result.examples.push(value);
      break;
    case 'returns':
    case 'return':
      result.returns = value;
      break;
    case 'description':
      if (!result.description) {
        result.description = value;
      }
      break;
  }
}

export function extractAPIFromSource(source) {
  const functions = [];
  const constants = [];
  const classes = [];

  let match;
  JSDOC_PATTERN.lastIndex = 0;

  while ((match = JSDOC_PATTERN.exec(source)) !== null) {
    const comment = match[1];
    const type = match[3];
    const name = match[4];

    const doc = parseJSDoc(comment);
    doc.name = doc.name || name;

    if (type === 'function') {
      functions.push(doc);
    } else if (type === 'class') {
      classes.push(doc);
    } else {
      constants.push(doc);
    }
  }

  const methodPattern = /\/\*\*([\s\S]*?)\*\/\s*(?:static\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
  methodPattern.lastIndex = 0;
  const methods = [];

  while ((match = methodPattern.exec(source)) !== null) {
    const comment = match[1];
    const name = match[2];

    if (name.startsWith('_')) continue;

    const doc = parseJSDoc(comment);
    doc.name = doc.name || name;
    
    if (doc.description || doc.tags.length > 0 || doc.examples.length > 0) {
      methods.push(doc);
    }
  }

  return { functions, constants, classes, methods };
}

const CONTROLS_CATEGORIES = {
  sound: ['s', 'sound', 'n', 'bank', 'samples', 'loadSample', 'loadOrc'],
  rhythm: ['fast', 'slow', 'early', 'late', 'every', 'sometimes', 'often', 'rarely', 'always', 'never'],
  pattern: ['stack', 'seq', 'sequence', 'cat', 'fastcat', 'slowcat', 'polymeter', 'polyrhythm', 'pr', 'pm'],
  effects: ['gain', 'velocity', 'amp', 'cutoff', 'lpf', 'resonance', 'lpq', 'hpf', 'bpf', 'reverb', 'room', 'delay', 'pan', 'chorus'],
  envelope: ['attack', 'decay', 'sustain', 'release', 'lpa', 'lpd', 'lps', 'lpr'],
  filters: ['lpf', 'hpf', 'bpf', 'lpq', 'resonance', 'cutoff'],
  modulation: ['fm', 'fmi', 'fmh', 'tremolo', 'phaser'],
  timing: ['setcps', 'setcpm', 'setcps', 'setcpm', 'cps'],
  structure: ['mask', 'struct', 'reset', 'restart', 'euclid', 'euclidRot', 'bjorklund'],
  transformation: ['add', 'sub', 'mul', 'div', 'mod', 'rev', 'jux'],
  notes: ['note', 'scale', 'chord', 'arp', 'transpose', 'degree'],
  visualization: ['pianoroll', 'scope', 'spiral', 'punchcard', 'spectrum'],
};

const MINI_NOTATION_SYNTAX = `
## Mini Notation Syntax (for patterns inside strings like "bd sd hh")

Basic syntax:
- Space-separated events: "bd sd hh"
- Rest/silence: "~" or "-"
- Grouping with brackets: "[bd sd] hh"
- Polyrhythms with commas: "bd, sd, hh"
- Alternatives with angle brackets: "<bd sd hh>"
- Repetition with asterisk: "bd*4"
- Euclidean rhythms: "bd(3,8)" (3 pulses in 8 steps)
- Euclidean with rotation: "bd(3,8,1)"
- Duration with @: "bd@2 sd" (bd lasts 2 units)
- Degrade/random removal: "bd? sd" (50% chance)
- Degrade with probability: "bd?.3 sd" (30% chance)

Sample parameters with colon:
- s("bd:0 bd:1") - sample index
- s("bd:0:0.5") - sample index + gain
- lpf("1000:10") - cutoff + resonance

Common operators:
- .fast(n) - speed up by n times
- .slow(n) - slow down by n times
- .early(n) - shift earlier by n cycles
- .late(n) - shift later by n cycles
- .every(n, f) - apply f every n cycles
- .sometimes(f) - apply f 50% of the time
- .often(f) - apply f 75% of the time
- .rarely(f) - apply f 25% of the time
`;

export function generateSystemPrompt(apiDocs, examples) {
  const { controls, pattern, mini } = apiDocs;

  const coreConcepts = `
## Core Concepts

1. **Patterns**: Everything in Strudel is a pattern. Patterns generate events over time.
2. **Cycles**: Time is measured in cycles. A cycle is a repeating unit of time.
3. **Mini Notation**: A concise syntax for creating patterns inside strings (e.g., "bd sd hh")
4. **Chaining**: Methods are chained to transform patterns (e.g., s("bd").fast(2))
5. **Stack**: Use stack() or comma in mini notation to play patterns simultaneously
6. **Sequence**: Use seq() or space in mini notation to play patterns sequentially

## Common Pattern Structure

A typical Strudel pattern looks like:

\`\`\`javascript
// Basic drum pattern
s("bd sd [~ bd] sd, hh*8")
  .gain(0.8)
  .fast(2)

// Stacking multiple patterns
stack(
  s("bd sd").color('red'),
  note("c e g").s('piano').color('blue')
)

// Using labels for block-based evaluation
$: s("bd sd")  // bass drum pattern
$: note("c e g")  // melody pattern
\`\`\`

## Important Controls

### Sound Selection
- \`s("bd sd hh")\` - select sounds by name
- \`n(0)\` - select sample index
- \`bank("RolandTR909")\` - select sample bank

### Notes and Melody
- \`note("c4 e4 g4")\` - play specific notes
- \`scale("C major")\` - define a scale
- \`n("0 2 4")\` - scale degrees (0=root, 2=third, 4=fifth)
- \`chord("Cm7")\` - play a chord
- \`arp("0 2 4")\` - arpeggiate

### Effects
- \`gain(0.8)\` - set volume (0-1 typically)
- \`velocity(0.5)\` - another volume control
- \`lpf(1000)\` - low pass filter (cutoff frequency)
- \`lpq(5)\` - filter resonance/Q
- \`hpf(500)\` - high pass filter
- \`delay(0.5)\` - delay effect (mix 0-1)
- \`delaytime(0.25)\` - delay time in cycles
- \`delayfeedback(0.5)\` - delay feedback (0-1)
- \`room(0.5)\` - reverb amount
- \`pan(0.5)\` - stereo panning (-1 to 1)
- \`chorus(0.3)\` - chorus effect

### Envelope
- \`attack(0.01)\` - attack time in seconds
- \`decay(0.1)\` - decay time in seconds
- \`sustain(0.5)\` - sustain level (0-1)
- \`release(0.3)\` - release time in seconds

### Timing and Rhythm
- \`fast(2)\` - play twice as fast
- \`slow(2)\` - play half as fast
- \`early(0.25)\` - shift earlier by 1/4 cycle
- \`late(0.25)\` - shift later by 1/4 cycle
- \`every(4, fast(2))\` - every 4th cycle, play twice as fast
- \`euclid(3, 8)\` - 3 pulses in 8 steps (Euclidean rhythm)
- \`struct("x ~ x ~")\` - apply a rhythmic structure

### Pattern Combination
- \`stack(a, b)\` - play patterns simultaneously
- \`seq(a, b)\` - play patterns sequentially
- \`a.set(b)\` - combine patterns (b overrides a where both have values)
- \`a.keep(b)\` - keep values from a where b has values

### Visualization
- \`pianoroll()\` - show piano roll visualization
- \`scope()\` - show waveform
- \`spiral()\` - spiral visualization

### Tempo
- \`setcps(1)\` - set cycles per second
- \`setcpm(120)\` - set cycles per minute (120 BPM if 1 cycle = 1 beat)
`;

  const exampleSection = examples.length > 0 
    ? `\n## Relevant Examples\n\n${examples.map((ex, i) => `### Example ${i + 1}\n\`\`\`javascript\n${ex}\n\`\`\``).join('\n\n')}`
    : '';

  return `You are an expert at generating Strudel code for live coding music.

Strudel is a JavaScript port of Tidal Cycles, a domain-specific language for live coding music.

${coreConcepts}

${MINI_NOTATION_SYNTAX}

## Guidelines for Generation

1. **Use mini notation** for patterns inside strings - it's more concise and idiomatic
2. **Chain methods** using dot notation: \`s("bd").fast(2).gain(0.8)\`
3. **Use stack()** to play multiple patterns at the same time
4. **Use seq()** or just spaces in mini notation for sequential patterns
5. **Add comments** explaining what different parts do
6. **Use color()** to visually distinguish different parts in the piano roll
7. **Keep it simple** - start with basic patterns, then add complexity
8. **For block-based evaluation**, use labels like \`$:\` before each pattern

## Important Notes

- Mini notation strings use double quotes: \`"bd sd"\`
- Pattern methods are chained with dots
- Use \`stack()\` for simultaneous patterns
- Use \`seq()\` or just spaces for sequential patterns
- The last expression in the code is what will be evaluated

${exampleSection}

Generate only valid Strudel JavaScript code. Do not include any markdown formatting in your response, just the code. Add comments explaining the pattern.`;
}

export function getEssentialAPISummary() {
  return {
    controls: {
      sound: ['s', 'n', 'bank', 'samples'],
      notes: ['note', 'scale', 'chord', 'arp', 'transpose'],
      effects: ['gain', 'velocity', 'lpf', 'hpf', 'bpf', 'lpq', 'resonance', 'delay', 'room', 'pan', 'chorus', 'phaser', 'tremolo'],
      envelope: ['attack', 'decay', 'sustain', 'release'],
      rhythm: ['fast', 'slow', 'early', 'late', 'every', 'sometimes', 'often', 'rarely', 'euclid'],
      structure: ['stack', 'seq', 'sequence', 'cat', 'mask', 'struct', 'reset', 'restart'],
      transformation: ['add', 'sub', 'mul', 'div', 'rev', 'jux', 'superimpose', 'layer'],
      tempo: ['setcps', 'setcpm'],
      visualization: ['pianoroll', 'scope', 'spiral'],
    },
    miniNotation: {
      basics: ['space-separated events', '~ for silence', '[ ] for grouping', ', for polyrhythms'],
      repetition: ['*n for repetition', '(n,k) for Euclidean rhythms', '@n for duration'],
      alternatives: ['< > for alternatives', '? for random removal'],
      parameters: [': for sample index/gain', ': for filter parameters'],
    },
  };
}
