/*
example-selector.mjs - Select relevant examples for AI context
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

export const CATEGORIZED_EXAMPLES = {
  drums: [
    {
      title: 'Basic Drum Pattern',
      code: `// Basic 4/4 drum pattern
stack(
  s("bd sd [~ bd] sd").color('#F5A623'),
  s("hh*8").color('#673AB7')
)`,
      tags: ['drums', 'basic', 'stack', 'bd', 'sd', 'hh'],
    },
    {
      title: 'TR-909 Drums',
      code: `// Roland TR-909 style drums
stack(
  s("bd*2").mask("<x@7 ~>/8").bank('RolandTR909'),
  s("~ <sd!7 [sd@3 ~]>").mask("<x@7 ~>/4").bank('RolandTR909'),
  s("[~ hh]*2").delay(.3).delayfeedback(.5).delaytime(.125).bank('RolandTR909')
)`,
      tags: ['drums', 'TR-909', 'bank', 'delay', 'mask'],
    },
    {
      title: 'Euclidean Drums',
      code: `// Euclidean rhythms for drums
stack(
  s("bd").euclid(3, 8).color('red'),
  s("sd").euclid(2, 8).color('blue'),
  s("hh").euclid(7, 8).color('green')
)`,
      tags: ['drums', 'euclid', 'euclidean', 'rhythm'],
    },
    {
      title: 'Hi-hat Variations',
      code: `// Hi-hat patterns with variations
s("hh*8")
  .gain(".4!2 1 .4!2 1 .4 1")
  .velocity(".4 1")
  .fast(2)`,
      tags: ['drums', 'hi-hat', 'hh', 'gain', 'velocity', 'variation'],
    },
  ],
  melody: [
    {
      title: 'Simple Melody',
      code: `// Simple melody with scale
n("0 1 2 3 4 5 6 7")
  .scale("C major")
  .note()
  .s('piano')`,
      tags: ['melody', 'scale', 'note', 'piano', 'n'],
    },
    {
      title: 'Arpeggio',
      code: `// Arpeggiated chord
chord("Cm7")
  .dict('lefthand')
  .voicing()
  .arp("0 2 4 2")
  .note()
  .s('sawtooth')
  .fast(2)`,
      tags: ['melody', 'arp', 'arpeggio', 'chord', 'voicing'],
    },
    {
      title: 'Scale Pattern',
      code: `// Melodic pattern using scale degrees
n("<0 2 4 7>")
  .scale("D minor pentatonic")
  .struct("x(3,8,-1)")
  .note()
  .s('triangle')
  .decay(.1)`,
      tags: ['melody', 'scale', 'pentatonic', 'struct', 'pattern'],
    },
  ],
  bass: [
    {
      title: 'Simple Bassline',
      code: `// Basic bassline
note("c2 f2 g2 f2")
  .s('sawtooth')
  .decay(.2)
  .lpf(400)
  .lpq(5)`,
      tags: ['bass', 'sawtooth', 'lpf', 'decay'],
    },
    {
      title: 'Funky Bass',
      code: `// Funky bass pattern with syncopation
note("c2 [~ c2] f2 [~ f2]")
  .struct("x [~ x] x [~ x ~ x]")
  .s('sawtooth')
  .decay(.1)
  .lpf(300)
  .lpenv(3)`,
      tags: ['bass', 'funky', 'syncopation', 'struct', 'lpenv'],
    },
  ],
  chords: [
    {
      title: 'Chord Progression',
      code: `// Chord progression with voicings
chord("<Cm7 Fm7 G7 C^7>")
  .dict('lefthand')
  .voicing()
  .struct("x(3,8)")
  .s('piano')
  .gain(.6)`,
      tags: ['chord', 'progression', 'voicing', 'dict', 'lefthand'],
    },
    {
      title: 'Jazz Chords',
      code: `// Jazz chord progression
chord("<Dm7 G7 C^7 A7>")
  .mode('below:G4')
  .dict('lefthand')
  .voicing()
  .euclidLegato(3, 8)
  .s('piano')`,
      tags: ['chord', 'jazz', 'euclidLegato', 'mode'],
    },
  ],
  effects: [
    {
      title: 'Delay Effect',
      code: `// Using delay effect
s("bd sd")
  .delay(.5)
  .delaytime(.33)
  .delayfeedback(.6)`,
      tags: ['effects', 'delay', 'delaytime', 'delayfeedback'],
    },
    {
      title: 'Reverb and Chorus',
      code: `// Reverb and chorus effects
note("c4 e4 g4")
  .s('sawtooth')
  .decay(.2)
  .room(.8)
  .chorus(.5)`,
      tags: ['effects', 'reverb', 'room', 'chorus'],
    },
    {
      title: 'Filter Envelope',
      code: `// Filter envelope
s("sawtooth")
  .note("c3")
  .lpf(300)
  .lpa(.2)
  .lpd(.1)
  .lps(.5)
  .lpr(.3)
  .lpenv(4)`,
      tags: ['effects', 'filter', 'envelope', 'lpf', 'lpenv'],
    },
  ],
  synthesis: [
    {
      title: 'FM Synthesis',
      code: `// FM synthesis basics
note("c4 e4 g4 b4")
  .s('sine')
  .fm(4)
  .fmh(1.06)
  .decay(.2)`,
      tags: ['synthesis', 'fm', 'frequency modulation', 'fmh'],
    },
    {
      title: 'Wavetable Synthesis',
      code: `// Wavetable synthesis
s("squelch")
  .bank("wt_digital")
  .seg(8)
  .note("F1")
  .wt("0 0.25 0.5 0.75 1")`,
      tags: ['synthesis', 'wavetable', 'wt', 'bank', 'seg'],
    },
  ],
  pattern: [
    {
      title: 'Stack and Sequence',
      code: `// Combining stack and sequence
stack(
  seq("bd sd bd sd").color('red'),
  seq("hh hh hh hh").fast(2).color('blue')
)`,
      tags: ['pattern', 'stack', 'seq', 'sequence', 'fast'],
    },
    {
      title: 'Mini Notation Patterns',
      code: `// Advanced mini notation
stack(
  s("bd(3,8)").color('red'),
  s("[~ hh]*2").color('blue'),
  s("<sd cp>").color('green')
)
  .fast(2)`,
      tags: ['pattern', 'mini notation', 'euclid', 'alternatives'],
    },
    {
      title: 'Every and Sometimes',
      code: `// Using every and sometimes for variation
s("bd sd bd sd, hh*8")
  .every(4, fast(2))
  .sometimes(x => x.add(note(12)))`,
      tags: ['pattern', 'every', 'sometimes', 'variation', 'modulation'],
    },
  ],
  labels: [
    {
      title: 'Block-Based Evaluation',
      code: `// Using labels for multiple patterns
$: s("bd sd [~ bd] sd")
  .bank('RolandTR909')
  .color('tomato')

$: note("c3 e3 g3 b3")
  .s('sawtooth')
  .lpf(800)
  .color('steelblue')

$: s("hh*8")
  .delay(.3)
  .color('lightgreen')`,
      tags: ['labels', 'block', 'evaluation', 'multiple patterns', '$'],
    },
  ],
  complete: [
    {
      title: 'Full Track Example',
      code: `// Complete track with drums, bass, and melody
setcps(1)

stack(
  // Drums
  s("bd:4!4")
    .beat("0,4,8,11,14", 16)
    .bank('RolandTR909')
    .color('tomato'),
  
  // Bass
  note("<c2 f2 g2 f2>")
    .s('sawtooth')
    .decay(.15)
    .lpf(350)
    .lpenv(2)
    .color('steelblue'),
  
  // Melody
  n("<0 2 4 7>")
    .scale("C minor pentatonic")
    .struct("x(3,8,-1)")
    .note()
    .s('triangle')
    .decay(.1)
    .delay(.2)
    .color('lightgreen')
)`,
      tags: ['complete', 'track', 'drums', 'bass', 'melody', 'full'],
    },
  ],
};

const CATEGORY_KEYWORDS = {
  drums: ['drum', 'drums', 'beat', 'beats', 'rhythm', 'percussion', 'bd', 'sd', 'hh', 'hi-hat', 'kick', 'snare'],
  melody: ['melody', 'melodic', 'tune', 'note', 'notes', 'piano', 'synth', 'lead'],
  bass: ['bass', 'bassline', 'low', 'deep'],
  chords: ['chord', 'chords', 'harmony', 'harmonic', 'progression', 'voicing'],
  effects: ['effect', 'effects', 'delay', 'reverb', 'filter', 'chorus', 'phaser', 'tremolo'],
  synthesis: ['synth', 'synthesis', 'fm', 'wavetable', 'oscillator', 'sound design'],
  pattern: ['pattern', 'stack', 'seq', 'sequence', 'every', 'sometimes', 'mini notation', 'euclid'],
  labels: ['label', 'labels', 'block', 'multiple', '$', 'separate'],
  complete: ['complete', 'full', 'track', 'song', 'entire', 'all'],
};

function calculateRelevance(userInput, example) {
  let score = 0;
  const inputLower = userInput.toLowerCase();
  const tags = example.tags.map(t => t.toLowerCase());
  const codeLower = example.code.toLowerCase();

  for (const tag of tags) {
    if (inputLower.includes(tag)) {
      score += 2;
    }
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (inputLower.includes(keyword)) {
        score += 1;
        if (CATEGORIZED_EXAMPLES[category]?.some(ex => ex.title === example.title)) {
          score += 2;
        }
      }
    }
  }

  for (const tag of tags) {
    if (codeLower.includes(tag)) {
      score += 0.5;
    }
  }

  return score;
}

export function selectRelevantExamples(userInput, maxExamples = 6) {
  const allExamples = [];
  
  for (const category of Object.values(CATEGORIZED_EXAMPLES)) {
    for (const example of category) {
      allExamples.push({
        ...example,
        relevance: calculateRelevance(userInput, example),
      });
    }
  }

  allExamples.sort((a, b) => b.relevance - a.relevance);

  const selected = [];
  const seenTitles = new Set();
  
  for (const example of allExamples) {
    if (seenTitles.has(example.title)) continue;
    
    if (selected.length < maxExamples) {
      selected.push(example);
      seenTitles.add(example.title);
    } else if (example.relevance > 0) {
      break;
    }
  }

  if (selected.length === 0) {
    const basics = [
      ...CATEGORIZED_EXAMPLES.drums.slice(0, 2),
      ...CATEGORIZED_EXAMPLES.melody.slice(0, 2),
      ...CATEGORIZED_EXAMPLES.complete.slice(0, 2),
    ];
    return basics.slice(0, maxExamples).map(ex => ex.code);
  }

  return selected.map(ex => ex.code);
}

export function getExampleByCategory(category, maxExamples = 4) {
  const examples = CATEGORIZED_EXAMPLES[category] || [];
  return examples.slice(0, maxExamples).map(ex => ex.code);
}

export function getRandomExamples(count = 5) {
  const allExamples = [];
  for (const category of Object.values(CATEGORIZED_EXAMPLES)) {
    for (const example of category) {
      allExamples.push(example);
    }
  }
  
  const shuffled = [...allExamples].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(ex => ex.code);
}
