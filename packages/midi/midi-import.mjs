/*
midi-import.mjs - MIDI file to Strudel Pattern conversion
Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/midi/midi-import.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
  loadMidiFromFile,
  secondsToCycles,
  quantizeTime,
  midiToNoteName,
  getMidiTempo,
  getMidiTimeSignature,
  DEFAULT_BPM,
  DEFAULT_PPQ,
} from './midi-file.mjs';
import { logger, pure, sequence, stack, silence } from '@strudel/core';

export const DEFAULT_IMPORT_OPTIONS = {
  bpm: DEFAULT_BPM,
  beatsPerCycle: 4,
  quantization: 0.25,
  velocityThreshold: 0,
  includeCC: true,
  ccThreshold: 0,
  trackFilter: null,
  channelFilter: null,
  generateMiniNotation: true,
  separateTracks: true,
  usePatternSyntax: false,
  velocityAsGain: true,
  durationAsNoteLength: true,
};

export function mergeImportOptions(options = {}) {
  return { ...DEFAULT_IMPORT_OPTIONS, ...options };
}

function quantizeMidiTime(time, options) {
  const { quantization, bpm, beatsPerCycle } = options;
  const cycles = secondsToCycles(time, bpm, beatsPerCycle);
  if (quantization > 0) {
    return quantizeTime(cycles, quantization);
  }
  return cycles;
}

function groupEventsByTime(events, options) {
  const timeGroups = new Map();

  for (const event of events) {
    const quantizedTime = quantizeMidiTime(event.time, options);
    if (!timeGroups.has(quantizedTime)) {
      timeGroups.set(quantizedTime, []);
    }
    timeGroups.get(quantizedTime).push(event);
  }

  return timeGroups;
}

function sortByTime(events) {
  return [...events].sort((a, b) => a.time - b.time);
}

function getDurationInCycles(event, nextEventTime, options) {
  const { bpm, beatsPerCycle } = options;
  let durationCycles;

  if (event.duration) {
    durationCycles = secondsToCycles(event.duration, bpm, beatsPerCycle);
  } else if (nextEventTime !== undefined) {
    durationCycles = nextEventTime - quantizeMidiTime(event.time, options);
  } else {
    durationCycles = options.quantization || 0.25;
  }

  return Math.max(0.01, durationCycles);
}

function midiEventToStrudelValue(event, options) {
  const value = {};

  if (event.type === 'note') {
    value.note = midiToNoteName(event.midi);
    if (options.velocityAsGain && event.velocity !== undefined) {
      value.gain = Math.max(0.1, event.velocity);
    }
    if (event.channel !== undefined && event.channel !== 0) {
      value.midichan = event.channel + 1;
    }
  } else if (event.type === 'cc') {
    value.ccn = event.number;
    value.ccv = event.value / 127;
  }

  return value;
}

export function parseMidiTrack(track, trackIndex, options) {
  const parsed = {
    name: track.name || `Track ${trackIndex + 1}`,
    channel: track.channel,
    notes: [],
    controlChanges: [],
  };

  const { velocityThreshold, includeCC, ccThreshold } = options;

  for (const note of track.notes) {
    if (velocityThreshold > 0 && note.velocity < velocityThreshold) {
      continue;
    }
    parsed.notes.push({
      type: 'note',
      midi: note.midi,
      name: note.name,
      time: note.time,
      ticks: note.ticks,
      duration: note.duration,
      velocity: note.velocity,
      channel: track.channel,
      octave: note.octave,
      pitch: note.pitch,
    });
  }

  if (includeCC) {
    for (const [ccNum, ccEvents] of Object.entries(track.controlChanges)) {
      for (const ccEvent of ccEvents) {
        if (ccThreshold > 0 && ccEvent.value < ccThreshold) {
          continue;
        }
        parsed.controlChanges.push({
          type: 'cc',
          number: parseInt(ccNum, 10),
          value: ccEvent.value,
          time: ccEvent.time,
          ticks: ccEvent.ticks,
          channel: track.channel,
        });
      }
    }
  }

  parsed.notes = sortByTime(parsed.notes);
  parsed.controlChanges = sortByTime(parsed.controlChanges);

  return parsed;
}

export function parseMidiToEvents(midi, options = {}) {
  const opts = mergeImportOptions(options);
  const { trackFilter, channelFilter } = opts;

  const bpm = getMidiTempo(midi);
  const timeSignature = getMidiTimeSignature(midi);
  opts.bpm = bpm;

  const tracks = [];

  for (let i = 0; i < midi.tracks.length; i++) {
    const track = midi.tracks[i];

    if (trackFilter !== null && typeof trackFilter === 'number') {
      if (i !== trackFilter) continue;
    } else if (trackFilter !== null && Array.isArray(trackFilter)) {
      if (!trackFilter.includes(i)) continue;
    }

    if (channelFilter !== null && typeof channelFilter === 'number') {
      if (track.channel !== channelFilter) continue;
    } else if (channelFilter !== null && Array.isArray(channelFilter)) {
      if (!channelFilter.includes(track.channel)) continue;
    }

    const parsedTrack = parseMidiTrack(track, i, opts);
    tracks.push(parsedTrack);
  }

  return {
    tracks,
    bpm,
    timeSignature,
    duration: midi.duration,
    header: {
      ppq: midi.header.ppq,
      tempos: midi.header.tempos,
      timeSignatures: midi.header.timeSignatures,
    },
  };
}

function generateMiniNotationForTrack(trackData, options) {
  const { notes, controlChanges } = trackData;
  const { quantization, bpm, beatsPerCycle } = options;

  if (notes.length === 0) {
    return 'silence';
  }

  const timeGroups = groupEventsByTime(notes, options);
  const sortedTimes = Array.from(timeGroups.keys()).sort((a, b) => a - b);

  if (sortedTimes.length === 0) {
    return 'silence';
  }

  const minTime = sortedTimes[0];
  const maxTime = sortedTimes[sortedTimes.length - 1] + (quantization || 0.25);
  const cycleSpan = maxTime - minTime;

  const gridSize = quantization || 0.25;
  const gridSteps = Math.max(1, Math.round(cycleSpan / gridSize));

  const grid = new Array(gridSteps).fill(null).map(() => ({ notes: [], hasRest: true }));

  for (const [time, events] of timeGroups.entries()) {
    const relativeTime = time - minTime;
    const gridIndex = Math.round(relativeTime / gridSize);
    if (gridIndex >= 0 && gridIndex < gridSteps) {
      grid[gridIndex].notes.push(...events);
      grid[gridIndex].hasRest = false;
    }
  }

  const noteStrings = [];
  let consecutiveRests = 0;

  for (const cell of grid) {
    if (cell.hasRest) {
      consecutiveRests++;
    } else {
      if (consecutiveRests > 0) {
        if (consecutiveRests === 1) {
          noteStrings.push('~');
        } else {
          noteStrings.push(`~*${consecutiveRests}`);
        }
        consecutiveRests = 0;
      }

      if (cell.notes.length === 1) {
        const note = cell.notes[0];
        const noteName = note.name.toLowerCase();
        if (note.velocity !== undefined && note.velocity < 0.9) {
          const gain = Math.round(note.velocity * 10) / 10;
          noteStrings.push(`${noteName}:${gain}`);
        } else {
          noteStrings.push(noteName);
        }
      } else {
        const chordNotes = cell.notes.map(note => {
          const noteName = note.name.toLowerCase();
          if (note.velocity !== undefined && note.velocity < 0.9) {
            const gain = Math.round(note.velocity * 10) / 10;
            return `${noteName}:${gain}`;
          }
          return noteName;
        });
        noteStrings.push(`[${chordNotes.join(' ')}]`);
      }
    }
  }

  if (consecutiveRests > 0) {
    if (consecutiveRests === 1) {
      noteStrings.push('~');
    } else {
      noteStrings.push(`~*${consecutiveRests}`);
    }
  }

  const basePattern = noteStrings.join(' ');

  if (controlChanges.length > 0) {
    return `note("${basePattern}")`;
  }

  return `"${basePattern}"`;
}

function generatePatternSyntaxForTrack(trackData, options) {
  const { notes, controlChanges } = trackData;

  if (notes.length === 0) {
    return 'silence';
  }

  const { quantization, bpm, beatsPerCycle } = options;
  const timeGroups = groupEventsByTime(notes, options);
  const sortedTimes = Array.from(timeGroups.keys()).sort((a, b) => a - b);

  const minTime = sortedTimes[0];
  const eventPatterns = [];

  for (const time of sortedTimes) {
    const events = timeGroups.get(time);
    const relativeTime = time - minTime;

    if (events.length === 1) {
      const note = events[0];
      const noteName = midiToNoteName(note.midi);
      let pattern = `pure("${noteName}")`;
      if (note.velocity !== undefined && note.velocity < 0.9) {
        pattern += `.gain(${Math.round(note.velocity * 10) / 10})`;
      }
      if (relativeTime > 0) {
        pattern = `${pattern}.late(${relativeTime})`;
      }
      eventPatterns.push(pattern);
    } else {
      const chordNotes = events.map(note => `"${midiToNoteName(note.midi)}"`);
      let pattern = `stack(${chordNotes.join(', ')})`;
      if (events.some(n => n.velocity < 0.9)) {
        const avgGain = events.reduce((sum, n) => sum + (n.velocity || 0.9), 0) / events.length;
        if (avgGain < 0.9) {
          pattern += `.gain(${Math.round(avgGain * 10) / 10})`;
        }
      }
      if (relativeTime > 0) {
        pattern = `${pattern}.late(${relativeTime})`;
      }
      eventPatterns.push(pattern);
    }
  }

  if (eventPatterns.length === 1) {
    return eventPatterns[0];
  }

  return `sequence(${eventPatterns.join(', ')})`;
}

function generateCCPatterns(controlChanges, options) {
  if (!controlChanges || controlChanges.length === 0) {
    return [];
  }

  const patterns = [];
  const groupedByCC = new Map();

  for (const ccEvent of controlChanges) {
    const ccNum = ccEvent.number;
    if (!groupedByCC.has(ccNum)) {
      groupedByCC.set(ccNum, []);
    }
    groupedByCC.get(ccNum).push(ccEvent);
  }

  for (const [ccNum, events] of groupedByCC.entries()) {
    const sortedEvents = sortByTime(events);
    const timeGroups = groupEventsByTime(sortedEvents, options);
    const sortedTimes = Array.from(timeGroups.keys()).sort((a, b) => a - b);

    if (sortedTimes.length > 0) {
      const minTime = sortedTimes[0];
      const ccValues = [];
      for (const time of sortedTimes) {
        const eventsAtTime = timeGroups.get(time);
        if (eventsAtTime.length > 0) {
          const midiValue = eventsAtTime[0].value;
          const ccv = midiValue / 127;
          ccValues.push(Math.round(ccv * 10000) / 10000);
        }
      }

      if (ccValues.length > 0) {
        const ccnPattern = `"${ccNum}"`;
        const ccvPattern = ccValues.length === 1
          ? ccValues[0]
          : `"${ccValues.join(' ')}"`;
        patterns.push(`.ccn(${ccnPattern}).ccv(${ccvPattern})`);
      }
    }
  }

  return patterns;
}

export function generateStrudelCode(parsedMidi, options = {}) {
  const opts = mergeImportOptions(options);
  const {
    generateMiniNotation,
    separateTracks,
    usePatternSyntax,
    bpm: overrideBpm,
  } = opts;

  const tracks = parsedMidi.tracks;
  const bpm = overrideBpm || parsedMidi.bpm;

  if (tracks.length === 0) {
    return {
      code: 'silence',
      tracks: [],
      metadata: { bpm, trackCount: 0 },
    };
  }

  const trackCodes = [];
  const trackMetadata = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const noteCount = track.notes.length;
    const ccCount = track.controlChanges.length;

    let trackCode;

    if (usePatternSyntax) {
      trackCode = generatePatternSyntaxForTrack(track, { ...opts, bpm });
    } else {
      trackCode = generateMiniNotationForTrack(track, { ...opts, bpm });
    }

    const ccPatterns = generateCCPatterns(track.controlChanges, { ...opts, bpm });
    if (ccPatterns.length > 0) {
      trackCode = trackCode + ccPatterns.join('');
    }

    trackCodes.push(trackCode);
    trackMetadata.push({
      index: i,
      name: track.name,
      channel: track.channel,
      noteCount,
      ccCount,
    });
  }

  let finalCode;
  if (separateTracks && trackCodes.length > 1) {
    const labeledTracks = trackCodes.map((code, i) => {
      const label = String.fromCharCode(97 + i);
      return `$${label}: ${code}`;
    });
    finalCode = labeledTracks.join('\n');
  } else if (trackCodes.length > 1) {
    finalCode = `stack(\n  ${trackCodes.join(',\n  ')}\n)`;
  } else {
    finalCode = trackCodes[0];
  }

  const setupCode = [];
  if (bpm !== DEFAULT_BPM) {
    setupCode.push(`setcpm(${bpm}/4)`);
  }

  if (setupCode.length > 0) {
    finalCode = setupCode.join('\n') + '\n\n' + finalCode;
  }

  return {
    code: finalCode,
    tracks: trackMetadata,
    metadata: {
      bpm,
      timeSignature: parsedMidi.timeSignature,
      trackCount: tracks.length,
      totalNotes: trackMetadata.reduce((sum, t) => sum + t.noteCount, 0),
      totalCCEvents: trackMetadata.reduce((sum, t) => sum + t.ccCount, 0),
    },
  };
}

export async function importMidiFile(file, options = {}) {
  const midi = await loadMidiFromFile(file);
  const parsed = parseMidiToEvents(midi, options);
  const strudelCode = generateStrudelCode(parsed, options);
  return {
    parsed,
    strudelCode,
    fileName: file.name,
  };
}

export function midiToPreview(parsedMidi, options = {}) {
  const opts = mergeImportOptions(options);
  const { tracks, bpm, timeSignature } = parsedMidi;

  const preview = {
    bpm,
    timeSignature,
    tracks: [],
    totalNotes: 0,
    totalCCEvents: 0,
  };

  for (const track of tracks) {
    const notePreview = track.notes.slice(0, 10).map(note => ({
      note: note.name,
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity,
    }));

    const ccPreview = track.controlChanges.slice(0, 5).map(cc => ({
      number: cc.number,
      value: cc.value,
      time: cc.time,
    }));

    preview.tracks.push({
      name: track.name,
      channel: track.channel,
      noteCount: track.notes.length,
      ccCount: track.controlChanges.length,
      previewNotes: notePreview,
      previewCC: ccPreview,
    });

    preview.totalNotes += track.notes.length;
    preview.totalCCEvents += track.controlChanges.length;
  }

  return preview;
}
