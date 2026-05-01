/*
example-selector.mjs - Select relevant examples for AI context
Copyright (C) 2025 Strudel contributors
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
*/

import * as tunes from '../tunes.mjs';

const EXAMPLE_METADATA = {
  sampleDrums: {
    title: 'Sample Drums',
    description: 'Basic drum pattern using external samples',
    tags: ['drums', 'samples', 'bd', 'sd', 'hh', 'kick', 'snare', 'hi-hat'],
    categories: ['drums', 'samples'],
  },
  caverave: {
    title: 'Caverave',
    description: 'Complete track with drums, bass, and synths',
    tags: ['drums', 'bass', 'synth', 'complete', 'stack', 'delay', 'mask'],
    categories: ['drums', 'complete', 'effects'],
  },
  delay: {
    title: 'Delay',
    description: 'Delay effect demonstration',
    tags: ['delay', 'effects', 'drums', 'bd', 'sd'],
    categories: ['effects', 'drums'],
  },
  orbit: {
    title: 'Orbit',
    description: 'Multiple delay buses using orbit',
    tags: ['delay', 'orbit', 'effects', 'drums', 'hh'],
    categories: ['effects', 'drums'],
  },
  flatrave: {
    title: 'Flatrave',
    description: 'Full track with Roland TR-909 drums, bass, and melody',
    tags: ['drums', 'bass', 'melody', 'complete', 'RolandTR909', 'lpf', 'lpenv'],
    categories: ['drums', 'complete', 'synthesis'],
  },
  meltingsubmarine: {
    title: 'Melting Submarine',
    description: 'Complex track with amen break, bass, chords, and effects',
    tags: ['drums', 'bass', 'chords', 'complete', 'amen', 'lpf', 'delay', 'degrade'],
    categories: ['drums', 'complete', 'synthesis'],
  },
  amensister: {
    title: 'Amensister',
    description: 'Amen break manipulation with bass and chords',
    tags: ['drums', 'amen', 'bass', 'chords', 'complete', 'chop', 'delay'],
    categories: ['drums', 'complete', 'samples'],
  },
  echoPiano: {
    title: 'Echo Piano',
    description: 'Piano melody with echo effect',
    tags: ['melody', 'piano', 'delay', 'echo', 'scale'],
    categories: ['melody', 'effects'],
  },
  barryHarris: {
    title: 'Barry Harris',
    description: 'Jazz exercise using scale and piano',
    tags: ['melody', 'jazz', 'scale', 'piano', 'bebop'],
    categories: ['melody'],
  },
  goodTimes: {
    title: 'Good Times',
    description: 'Funky pattern using scale and piano',
    tags: ['melody', 'funk', 'scale', 'piano', 'off'],
    categories: ['melody'],
  },
  swimming: {
    title: 'Swimming (Super Mario World)',
    description: 'Classic game melody with stack and layers',
    tags: ['melody', 'game', 'stack', 'note', 'color'],
    categories: ['melody', 'complete'],
  },
  sml1: {
    title: 'Super Mario Land',
    description: 'Game melody with multiple layers',
    tags: ['melody', 'game', 'stack', 'note', 'fast'],
    categories: ['melody', 'complete'],
  },
  giantSteps: {
    title: 'Giant Steps (John Coltrane)',
    description: 'Jazz standard with melody, chords, and bass',
    tags: ['jazz', 'chord', 'melody', 'bass', 'complete', 'voicing'],
    categories: ['chords', 'melody', 'complete'],
  },
  zeldasRescue: {
    title: 'Zelda\'s Rescue',
    description: 'Game theme with melody and bass',
    tags: ['melody', 'game', 'note', 'triangle', 'room'],
    categories: ['melody', 'synthesis'],
  },
  waa2: {
    title: 'Waa2',
    description: 'Synthesis demo with filter automation',
    tags: ['synthesis', 'sawtooth', 'square', 'cutoff', 'lpf', 'lpenv'],
    categories: ['synthesis'],
  },
  undergroundPlumber: {
    title: 'Underground Plumber',
    description: 'Funky track with echo and iter effects',
    tags: ['drums', 'bass', 'synth', 'echo', 'iter', 'square', 'cutoff'],
    categories: ['synthesis', 'drums', 'effects'],
  },
  bassFuge: {
    title: 'Bass Fuge',
    description: 'Bass-focused track with samples',
    tags: ['bass', 'samples', 'drums', 'cutoff', 'resonance'],
    categories: ['bass', 'samples'],
  },
  loungeSponge: {
    title: 'Lounge Sponge',
    description: 'Lounge style with CSound, chords and bass',
    tags: ['chord', 'bass', 'csound', 'voicing', 'euclidLegato'],
    categories: ['chords', 'synthesis'],
  },
  arpoon: {
    title: 'Arpoon',
    description: 'Arpeggiated chords with piano and bass',
    tags: ['chord', 'arpeggio', 'piano', 'bass', 'complete', 'voicing'],
    categories: ['chords', 'melody', 'complete'],
  },
  festivalOfFingers: {
    title: 'Festival of Fingers',
    description: 'Complex pattern with chords, rootNotes, and layers',
    tags: ['chord', 'melody', 'piano', 'complete', 'rootNotes', 'off'],
    categories: ['chords', 'melody', 'complete'],
  },
  belldub: {
    title: 'Belldub',
    description: 'Dub style with bass, percussion, and effects',
    tags: ['effects', 'bass', 'complete', 'delay', 'room', 'perlin', 'degrade'],
    categories: ['effects', 'complete'],
  },
  randomBells: {
    title: 'Random Bells',
    description: 'Randomized bell pattern with euclid and echo',
    tags: ['effects', 'random', 'euclid', 'echo', 'delay', 'samples'],
    categories: ['effects', 'samples'],
  },
  wavyKalimba: {
    title: 'Wavy Kalimba',
    description: 'Kalimba sample with scale and delay',
    tags: ['samples', 'kalimba', 'scale', 'delay', 'velocity'],
    categories: ['samples', 'melody'],
  },
  blippyRhodes: {
    title: 'Blippy Rhodes',
    description: 'Rhodes piano sample with drums and bass',
    tags: ['samples', 'rhodes', 'drums', 'bass', 'complete', 'delay'],
    categories: ['samples', 'complete'],
  },
  sampleDemo: {
    title: 'Sample Demo',
    description: 'Demonstration of various samples',
    tags: ['samples', 'percussion', 'melody', 'bass', 'clavisynth'],
    categories: ['samples'],
  },
  holyflute: {
    title: 'Holy Flute',
    description: 'Flute-like sound with layers',
    tags: ['melody', 'synthesis', 'ocarina', 'superimpose', 'color'],
    categories: ['melody', 'synthesis'],
  },
  juxUndTollerei: {
    title: 'Jux und Tollerei',
    description: 'Demonstration of jux effect',
    tags: ['effects', 'jux', 'rev', 'sawtooth', 'lpf'],
    categories: ['effects'],
  },
  chop: {
    title: 'Chop',
    description: 'Sample chopping demonstration',
    tags: ['samples', 'chop', 'loopAt', 'jux', 'rev'],
    categories: ['samples', 'effects'],
  },
  dinofunk: {
    title: 'Dinofunk',
    description: 'Funk track with samples and chords',
    tags: ['complete', 'samples', 'chord', 'bass', 'drums', 'delay'],
    categories: ['complete', 'samples'],
  },
  festivalOfFingers3: {
    title: 'Festival of Fingers 3',
    description: 'Complex pattern with echoWith and perlin',
    tags: ['melody', 'complete', 'echoWith', 'perlin', 'scale', 'piano'],
    categories: ['melody', 'complete', 'effects'],
  },
};

function extractTitleFromCode(code) {
  const titleMatch = code.match(/^\/\/\s*(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : 'Untitled';
}

function getBuiltInExamples() {
  const examples = [];
  
  for (const [key, code] of Object.entries(tunes)) {
    if (typeof code !== 'string') continue;
    
    const metadata = EXAMPLE_METADATA[key] || {
      title: extractTitleFromCode(code),
      description: '',
      tags: [],
      categories: ['other'],
    };
    
    examples.push({
      id: key,
      title: metadata.title,
      description: metadata.description,
      code: code,
      tags: metadata.tags,
      categories: metadata.categories,
    });
  }
  
  return examples;
}

const CATEGORY_KEYWORDS = {
  drums: ['drum', 'drums', 'beat', 'beats', 'rhythm', 'percussion', 'bd', 'sd', 'hh', 'hi-hat', 'kick', 'snare', 'hihat', 'cymbal'],
  melody: ['melody', 'melodic', 'tune', 'note', 'notes', 'piano', 'synth', 'lead', 'theme', 'song'],
  bass: ['bass', 'bassline', 'low', 'deep'],
  chords: ['chord', 'chords', 'harmony', 'harmonic', 'progression', 'voicing', 'jazz'],
  effects: ['effect', 'effects', 'delay', 'reverb', 'filter', 'chorus', 'phaser', 'tremolo', 'echo', 'lpf', 'cutoff'],
  synthesis: ['synth', 'synthesis', 'fm', 'wavetable', 'oscillator', 'sound design', 'sawtooth', 'square', 'sine'],
  samples: ['sample', 'samples', 'sampling', 'freesound', 'loophole'],
  complete: ['complete', 'full', 'track', 'song', 'entire', 'all', 'everything'],
};

function calculateRelevance(userInput, example) {
  let score = 0;
  const inputLower = userInput.toLowerCase();
  const tags = example.tags.map(t => t.toLowerCase());
  const codeLower = example.code.toLowerCase();

  for (const tag of tags) {
    if (inputLower.includes(tag)) {
      score += 3;
    }
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (inputLower.includes(keyword)) {
        score += 1;
        if (example.categories.includes(category)) {
          score += 2;
        }
      }
    }
  }

  const codeKeywords = ['stack', 'seq', 'note', 's(', 'delay', 'lpf', 'fast', 'slow', 'euclid'];
  for (const kw of codeKeywords) {
    if (codeLower.includes(kw) && inputLower.includes(kw)) {
      score += 1;
    }
  }

  return score;
}

export function selectRelevantExamples(userInput, maxExamples = 6) {
  const allExamples = getBuiltInExamples();
  
  const scoredExamples = allExamples.map(example => ({
    ...example,
    relevance: calculateRelevance(userInput, example),
  }));

  scoredExamples.sort((a, b) => b.relevance - a.relevance);

  const selected = [];
  const seenIds = new Set();
  
  for (const example of scoredExamples) {
    if (seenIds.has(example.id)) continue;
    
    if (selected.length < maxExamples) {
      selected.push(example);
      seenIds.add(example.id);
    } else if (example.relevance > 0) {
      break;
    }
  }

  if (selected.length === 0) {
    const defaultExamples = allExamples.filter(ex => 
      ['sampleDrums', 'caverave', 'flatrave', 'echoPiano', 'barryHarris', 'delay'].includes(ex.id)
    );
    return defaultExamples.slice(0, maxExamples).map(ex => ex.code);
  }

  return selected.map(ex => ex.code);
}

export function getExampleByCategory(category, maxExamples = 4) {
  const allExamples = getBuiltInExamples();
  const categoryExamples = allExamples.filter(ex => ex.categories.includes(category));
  return categoryExamples.slice(0, maxExamples).map(ex => ex.code);
}

export function getRandomExamples(count = 5) {
  const allExamples = getBuiltInExamples();
  const shuffled = [...allExamples].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(ex => ex.code);
}

export function getAllExamples() {
  return getBuiltInExamples();
}
