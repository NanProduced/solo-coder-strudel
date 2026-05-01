/*
api-extractor.mjs - Extract API documentation from Strudel source files
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import jsdocJson from '../../../../doc.json';

const CONTROLS_CATEGORIES = {
  samples: ['superdough', 'samples'],
  synthesis: ['synth', 'wavetable', 'fm'],
  effects: ['effects', 'filter', 'reverb', 'delay', 'chorus'],
  envelope: ['envelope'],
  rhythm: ['rhythm', 'euclid', 'pattern'],
  visualization: ['visualization', 'pianoroll'],
};

function isValidDoc(doc) {
  const isSupradoughOnly = doc.tags?.includes('supradough') && !doc.tags?.includes('superdough');
  const isSuperdirtOnly = doc.tags?.includes('superdirt') && !doc.tags?.includes('superdough');
  return doc.name && !doc.name.startsWith('_') && !!doc.description && !isSupradoughOnly && !isSuperdirtOnly;
}

function normalizeTags(tags) {
  if (!tags) return ['untagged'];
  return tags.filter((t) => t && typeof t === 'string');
}

function getHtmlInnerText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatParams(params) {
  if (!params || params.length === 0) return '';
  return params
    .map((p) => {
      const type = p.type?.names?.join(' | ') || 'any';
      const desc = p.description ? ` - ${getHtmlInnerText(p.description)}` : '';
      return `  @param {${type}} ${p.name}${desc}`;
    })
    .join('\n');
}

function formatExamples(examples) {
  if (!examples || examples.length === 0) return '';
  return examples.map((ex) => `  ${ex}`).join('\n');
}

export function extractAPIFromJSDoc() {
  const docs = [];
  const seen = new Set();

  for (const doc of jsdocJson.docs) {
    if (!isValidDoc(doc)) continue;
    if (seen.has(doc.name)) continue;

    const normalizedDoc = {
      name: doc.name,
      description: getHtmlInnerText(doc.description),
      tags: normalizeTags(doc.tags),
      params: doc.params || [],
      examples: doc.examples || [],
      synonyms: doc.synonyms || [],
      synonymsText: doc.synonyms_text || '',
      filename: doc.meta?.filename,
      lineno: doc.meta?.lineno,
    };

    const synonyms = doc.synonyms || [];
    for (const s of synonyms) {
      if (s && !seen.has(s)) {
        seen.add(s);
      }
    }

    docs.push(normalizedDoc);
    seen.add(doc.name);
  }

  return docs.sort((a, b) => a.name.localeCompare(b.name));
}

export function getFunctionsByFile(filename) {
  const allDocs = extractAPIFromJSDoc();
  return allDocs.filter((doc) => doc.filename === filename);
}

export function getFunctionsByTags(tags) {
  const allDocs = extractAPIFromJSDoc();
  const tagSet = new Set(tags);
  return allDocs.filter((doc) => doc.tags.some((t) => tagSet.has(t)));
}

export function getEssentialAPISummary() {
  const allDocs = extractAPIFromJSDoc();

  const controlsDocs = allDocs.filter((doc) => doc.filename === 'controls.mjs');
  const patternDocs = allDocs.filter((doc) => doc.filename === 'pattern.mjs');

  const highPriorityTags = [
    'superdough',
    'samples',
    'synth',
    'effects',
    'filter',
    'reverb',
    'delay',
    'envelope',
    'pattern',
    'euclid',
  ];

  const highPrioritySet = new Set(highPriorityTags);

  const essentialDocs = allDocs.filter((doc) => doc.tags.some((t) => highPrioritySet.has(t)));

  const categorized = {
    core: [],
    samples: [],
    synthesis: [],
    effects: [],
    envelope: [],
    pattern: [],
  };

  const coreFunctions = ['s', 'note', 'n', 'gain', 'stack', 'seq', 'fast', 'slow'];
  const coreSet = new Set(coreFunctions);

  for (const doc of essentialDocs) {
    if (coreSet.has(doc.name)) {
      categorized.core.push(doc);
    } else if (doc.tags.includes('samples') || doc.tags.includes('superdough')) {
      categorized.samples.push(doc);
    } else if (doc.tags.includes('synth') || doc.tags.includes('wavetable') || doc.tags.includes('fm')) {
      categorized.synthesis.push(doc);
    } else if (doc.tags.includes('effects') || doc.tags.includes('filter') || doc.tags.includes('reverb') || doc.tags.includes('delay') || doc.tags.includes('chorus')) {
      categorized.effects.push(doc);
    } else if (doc.tags.includes('envelope')) {
      categorized.envelope.push(doc);
    } else if (doc.tags.includes('pattern') || doc.tags.includes('euclid')) {
      categorized.pattern.push(doc);
    }
  }

  return categorized;
}

function docToMarkdown(doc) {
  const lines = [];
  lines.push(`### ${doc.name}`);
  if (doc.synonymsText) {
    lines.push(`**Synonyms:** ${doc.synonymsText}`);
  }
  if (doc.description) {
    lines.push(doc.description);
  }
  if (doc.params && doc.params.length > 0) {
    lines.push('**Parameters:**');
    for (const p of doc.params) {
      const type = p.type?.names?.join(' | ') || 'any';
      const desc = p.description ? ` - ${getHtmlInnerText(p.description)}` : '';
      lines.push(`- \`${p.name}\`: \`${type}\`${desc}`);
    }
  }
  if (doc.examples && doc.examples.length > 0) {
    lines.push('**Examples:**');
    for (const ex of doc.examples) {
      lines.push('```javascript');
      lines.push(ex);
      lines.push('```');
    }
  }
  if (doc.tags && doc.tags.length > 0 && doc.tags[0] !== 'untagged') {
    lines.push(`**Tags:** ${doc.tags.join(', ')}`);
  }
  return lines.join('\n');
}

export function generateSystemPrompt(apiSummary, examples = []) {
  const { core, samples, synthesis, effects, envelope, pattern } = apiSummary;

  const lines = [];

  lines.push(`# Strudel AI Code Generator

You are an expert at generating Strudel code for live coding music. Strudel is a JavaScript port of TidalCycles for live coding music patterns.

## Core Concepts

- **Patterns**: Everything in Strudel is a pattern - sequences of events that repeat over time.
- **Cycles**: Patterns repeat every cycle (by default 1 second, adjustable with setcps()).
- **Mini Notation**: A concise string syntax for defining patterns:
  - Space separates events: \`"bd sd"\` plays kick then snare
  - ~ means rest: \`"bd ~ sd ~"\`
  - [] groups events: \`"[bd sd] hh"\` plays kick+snare together, then hi-hat
  - , creates polyrhythms: \`"bd, sd*2"\` = 1 kick vs 2 snares per cycle
  - <> alternates: \`"<bd sd>"\` alternates kick and snare each cycle
  - * repeats: \`"hh*4"\` = 4 hi-hats per cycle
  - (n,k) Euclidean rhythm: \`"bd(3,8)"\` = 3 kicks over 8 steps
  - @ duration: \`"c@2"\` = C note held for 2 cycles

- **Chaining**: Methods are chained with . : \`s("bd").gain(.8).fast(2)\`
- **Mini Notation in strings**: Most pattern functions accept mini notation strings.

## Mini Notation Quick Reference

\`\`\`
"bd sd hh oh"       // 4 events: kick, snare, hi-hat, open-hat
"bd ~ sd ~"         // kick, rest, snare, rest
"[bd sd] hh"        // kick+snare together, then hi-hat
"bd, sd*2"          // 1 kick, 2 snares (polyrhythm)
"<bd sd> hh"        // kick then snare alternating, with hi-hat
"hh*8"              // 8 hi-hats per cycle
"bd(3,8)"           // Euclidean: 3 kicks over 8 steps
"c@2 d"             // c lasts 2 cycles, d is normal
\`\`\`

## Label-Based Evaluation

Use \`$: \` prefix to define multiple independent patterns that run simultaneously:

\`\`\`javascript
$: s("bd sd [~ bd] sd").bank('RolandTR909')
$: note("c3 e3 g3 b3").s('sawtooth').lpf(800)
$: s("hh*8").delay(.3)
\`\`\`

Each \`$: \` block is evaluated independently. This is the preferred way to create layered patterns in Strudel.

## Important: How to Structure Your Output

1. **ALWAYS use label-based evaluation** (\`$: \`) when creating multiple layers (drums + bass + melody etc.)
2. **Each layer should be a separate \`$: \` block**
3. **Use descriptive comments** to explain what each part does
4. **Include comments** for parameter values (e.g., \`// lpf=800 means low-pass filter at 800Hz\`)

## Essential Functions
`);

  if (core.length > 0) {
    lines.push('\n### Core Functions\n');
    for (const doc of core.slice(0, 10)) {
      lines.push(docToMarkdown(doc));
      lines.push('');
    }
  }

  if (samples.length > 0) {
    lines.push('\n### Sound / Sample Functions\n');
    for (const doc of samples.slice(0, 8)) {
      lines.push(docToMarkdown(doc));
      lines.push('');
    }
  }

  if (synthesis.length > 0) {
    lines.push('\n### Synthesis Functions\n');
    for (const doc of synthesis.slice(0, 6)) {
      lines.push(docToMarkdown(doc));
      lines.push('');
    }
  }

  if (effects.length > 0) {
    lines.push('\n### Effects\n');
    for (const doc of effects.slice(0, 10)) {
      lines.push(docToMarkdown(doc));
      lines.push('');
    }
  }

  if (envelope.length > 0) {
    lines.push('\n### Envelope\n');
    for (const doc of envelope.slice(0, 6)) {
      lines.push(docToMarkdown(doc));
      lines.push('');
    }
  }

  if (pattern.length > 0) {
    lines.push('\n### Pattern Manipulation\n');
    for (const doc of pattern.slice(0, 10)) {
      lines.push(docToMarkdown(doc));
      lines.push('');
    }
  }

  if (examples.length > 0) {
    lines.push('\n## Example Patterns\n');
    for (let i = 0; i < examples.length; i++) {
      lines.push(`\n### Example ${i + 1}\n`);
      lines.push('```javascript');
      lines.push(examples[i]);
      lines.push('```');
    }
  }

  lines.push(`
## Guidelines

1. **Use label-based evaluation** (\`$: \`) for multi-layer patterns (drums + bass + melody)
2. **Use mini notation** inside strings for rhythm patterns
3. **Chain methods** with . notation
4. **Use setcps()** at the top to set tempo (e.g., \`setcps(1.5)\` for faster)
5. **Keep it simple** - generate only what's requested
6. **Add comments** explaining parameter choices and sound design

## When Modifying Existing Code

When the user asks to modify existing code:

1. **Identify the relevant parts** - find which lines relate to the request
2. **Only modify those parts** - don't rewrite the entire pattern
3. **Keep other parts intact** - preserve the user's original work
4. **If modifying drums and user says "hi-hat more dense"**: only change the hi-hat pattern, leave kick/snare as is
5. **Use label-based context** - if the original uses \`$: \`, keep each block separate

## Output Format

Respond with ONLY the Strudel code in a \`\`\`javascript code block. Do NOT include any explanation text outside the code block. Use comments inside the code to explain your choices.

Example output format:
\`\`\`javascript
// Up-tempo drum and bass with swing
setcps(1.2)

$: s("bd sd [~ bd] sd").bank('RolandTR909')
$: note("c2 f2 g2 f2").s('sawtooth').lpf(400)
$: s("hh*8").gain(".4!2 1 .4!2 1 .4 1")
\`\`\`

Important:
- ALWAYS use \`$: \` for each independent layer when creating multi-part patterns
- Add descriptive comments explaining each section and parameter choices
- Only modify relevant parts when changing existing code
`);

  return lines.join('\n');
}

export function generateModifyPrompt(originalCode, modificationRequest) {
  return `You are modifying existing Strudel code. Read the request carefully and ONLY change the relevant parts.

## Original Code

\`\`\`javascript
${originalCode}
\`\`\`

## Modification Request

${modificationRequest}

## Instructions

1. **Identify which lines relate to the request**
2. **ONLY change those specific parts**
3. **Keep all other parts exactly the same**
4. **If request is about "hi-hat more dense"**: only modify the hi-hat pattern, leave kick/snare/melody/bass unchanged
5. **If using label-based (\`$: \`) patterns**: keep each block separate and only modify the relevant block(s)
6. **Preserve the original structure and style**

## Example

If original is:
\`\`\`javascript
$: s("bd sd bd sd")  // drums
$: s("hh*4")          // hi-hat
$: note("c3")         // bass
\`\`\`

And request is "hi-hat more dense":

Output should be:
\`\`\`javascript
$: s("bd sd bd sd")  // drums
$: s("hh*8")          // hi-hat - doubled from 4 to 8
$: note("c3")         // bass
\`\`\`

Notice: Only the hi-hat line changed, everything else stayed the same.

Respond with ONLY the complete modified code in a \`\`\`javascript code block.
`;
}

export { jsdocJson };
