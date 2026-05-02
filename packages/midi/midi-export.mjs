/*
midi-export.mjs - Export Strudel Pattern to MIDI file conversion
Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/midi/midi-export.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import {
  createEmptyMidi,
  createMidiTrack,
  addNoteToTrack,
  addCCToTrack,
  addProgramChange,
  cyclesToSeconds,
  getCCNumber,
  normalizeVelocity,
  midiToNoteName,
  downloadMidi,
  DEFAULT_BPM,
  DEFAULT_PPQ,
} from './midi-file.mjs';
import { noteToMidi, valueToMidi, logger } from '@strudel/core';
import { midicontrolMap } from './midi.mjs';

export const DEFAULT_CC_MAPPING = {
  lpf: 74,
  cutoff: 74,
  lpq: 71,
  resonance: 71,
  volume: 7,
  pan: 10,
  expression: 11,
  modulation: 1,
  sustain: 64,
  portamento: 65,
  reverb: 91,
  chorus: 93,
};

export const DEFAULT_EXPORT_OPTIONS = {
  startCycle: 0,
  endCycle: 4,
  bpm: DEFAULT_BPM,
  ppq: DEFAULT_PPQ,
  timeSignature: [4, 4],
  beatsPerCycle: 4,
  ccMapping: {},
  quantization: 0,
  defaultVelocity: 0.9,
  defaultMidichan: 1,
  separateTracks: true,
};

export function getCCMapping(customMapping = {}) {
  return { ...DEFAULT_CC_MAPPING, ...customMapping };
}

function getMidiCCFromHapValue(hapValue, ccMapping) {
  const ccEvents = [];

  if (hapValue.ccn !== undefined && hapValue.ccv !== undefined) {
    const ccNum = getCCNumber(hapValue.ccn);
    if (ccNum !== null) {
      const ccv = hapValue.ccv;
      const scaledCCValue = typeof ccv === 'number' && ccv <= 1 && ccv >= 0
        ? Math.round(ccv * 127)
        : Math.max(0, Math.min(127, Math.round(ccv)));
      ccEvents.push({
        number: ccNum,
        value: scaledCCValue,
      });
    }
  }

  for (const [controlName, ccNum] of Object.entries(ccMapping)) {
    if (hapValue[controlName] !== undefined) {
      let value = hapValue[controlName];
      if (typeof value === 'number') {
        let normalizedValue;
        if (controlName === 'lpf' || controlName === 'cutoff') {
          normalizedValue = Math.min(1, value / 20000);
        } else if (value <= 1 && value >= 0) {
          normalizedValue = value;
        } else if (value > 1 && value <= 127) {
          normalizedValue = value / 127;
        } else {
          normalizedValue = 0.5;
        }
        ccEvents.push({
          number: ccNum,
          value: Math.round(normalizedValue * 127),
        });
      }
    }
  }

  if (hapValue.midibend !== undefined) {
    const bend = Math.max(-1, Math.min(1, hapValue.midibend));
    ccEvents.push({
      type: 'pitchBend',
      value: bend,
    });
  }

  if (hapValue.miditouch !== undefined) {
    const touch = Math.max(0, Math.min(1, hapValue.miditouch));
    ccEvents.push({
      type: 'channelAftertouch',
      value: Math.round(touch * 127),
    });
  }

  if (hapValue.progNum !== undefined) {
    const progNum = Math.max(0, Math.min(127, Math.round(hapValue.progNum)));
    ccEvents.push({
      type: 'programChange',
      value: progNum,
    });
  }

  return ccEvents;
}

function getHapInfo(hap) {
  const value = hap.value;
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const info = {
    onset: hap.hasOnset(),
    whole: hap.whole,
    part: hap.part,
    duration: hap.duration,
  };

  if (value.note !== undefined) {
    info.hasNote = true;
    info.note = value.note;
  }

  if (value.velocity !== undefined) {
    info.velocity = value.velocity;
  }

  if (value.gain !== undefined) {
    info.gain = value.gain;
  }

  if (value.midichan !== undefined) {
    info.midichan = value.midichan;
  } else {
    info.midichan = 1;
  }

  if (value.midimap !== undefined) {
    info.midimap = value.midimap;
  }

  return info;
}

function groupHapsByChannel(haps) {
  const groups = new Map();

  for (const hap of haps) {
    const hapInfo = getHapInfo(hap);
    if (!hapInfo) continue;

    const channel = hapInfo.midichan || 1;
    if (!groups.has(channel)) {
      groups.set(channel, []);
    }
    groups.get(channel).push({ hap, hapInfo });
  }

  return groups;
}

function getMidimapCCMapping(midimapName) {
  if (midicontrolMap.has(midimapName)) {
    const mapping = midicontrolMap.get(midimapName);
    const ccMapping = {};
    for (const [controlName, config] of Object.entries(mapping)) {
      if (typeof config === 'object' && config.ccn !== undefined) {
        ccMapping[controlName] = config.ccn;
      } else if (typeof config === 'number') {
        ccMapping[controlName] = config;
      }
    }
    return ccMapping;
  }
  return {};
}

export function patternToMidiEvents(
  pattern,
  options = {},
) {
  const {
    startCycle = 0,
    endCycle = 4,
    bpm = DEFAULT_BPM,
    ppq = DEFAULT_PPQ,
    timeSignature = [4, 4],
    beatsPerCycle = 4,
    ccMapping = {},
    quantization = 0,
    defaultVelocity = 0.9,
    defaultMidichan = 1,
    separateTracks = true,
    trackNamePrefix = 'Track',
  } = options;

  if (!pattern || !pattern.queryArc) {
    throw new Error('Invalid pattern: must have queryArc method');
  }

  const haps = pattern.queryArc(startCycle, endCycle, {});

  if (!haps || haps.length === 0) {
    logger('[midi-export] No events found in pattern');
    return null;
  }

  const midi = createEmptyMidi({ ppq, bpm, timeSignature });

  const finalCCMapping = getCCMapping(ccMapping);

  let groupedHaps;
  if (separateTracks) {
    groupedHaps = groupHapsByChannel(haps);
  } else {
    const mappedHaps = haps.map(function(h) {
      return { hap: h, hapInfo: getHapInfo(h) };
    });
    groupedHaps = new Map();
    groupedHaps.set(defaultMidichan, mappedHaps);
  }

  const channelToTrack = new Map();
  let trackIndex = 0;

  for (const [channel, channelEvents] of groupedHaps.entries()) {
    const trackName = `${trackNamePrefix} ${channel}`;
    const track = createMidiTrack(midi, trackName, channel - 1);
    channelToTrack.set(channel, track);
    trackIndex++;

    const trackHaps = [];
    const trackCCs = [];

    for (const { hap, hapInfo } of channelEvents) {
      if (!hapInfo) continue;

      const onsetCycle = hap.whole?.begin?.valueOf();
      const durationCycle = hapInfo.duration.valueOf();

      let onsetSeconds = cyclesToSeconds(onsetCycle - startCycle, bpm, beatsPerCycle);
      let durationSeconds = cyclesToSeconds(durationCycle, bpm, beatsPerCycle);

      if (quantization > 0) {
        const quantGrid = cyclesToSeconds(quantization, bpm, beatsPerCycle);
        onsetSeconds = Math.round(onsetSeconds / quantGrid) * quantGrid;
      }

      if (hapInfo.hasNote && hapInfo.onset) {
        let midiNote;
        try {
          if (typeof hapInfo.note === 'number') {
            midiNote = Math.round(hapInfo.note);
          } else {
            midiNote = noteToMidi(hapInfo.note);
          }
        } catch (e) {
          logger(`[midi-export] Could not convert note: ${hapInfo.note}`, 'warning');
          continue;
        }

        let velocity = defaultVelocity;
        if (hapInfo.velocity !== undefined) {
          velocity = normalizeVelocity(hapInfo.velocity);
        }
        if (hapInfo.gain !== undefined) {
          velocity = velocity * hapInfo.gain;
        }

        trackHaps.push({
          midiNote: Math.max(0, Math.min(127, midiNote)),
          time: onsetSeconds,
          duration: Math.max(0.01, durationSeconds),
          velocity: Math.max(0, Math.min(1, velocity)),
        });
      }

      const hapCCMapping = { ...finalCCMapping };
      if (hapInfo.midimap) {
        const midimapCCs = getMidimapCCMapping(hapInfo.midimap);
        Object.assign(hapCCMapping, midimapCCs);
      }

      const ccEvents = getMidiCCFromHapValue(hap.value, hapCCMapping);
      for (const ccEvent of ccEvents) {
        if (ccEvent.type === 'pitchBend') {
          trackCCs.push({
            type: 'pitchBend',
            value: ccEvent.value,
            time: onsetSeconds,
          });
        } else if (ccEvent.type === 'channelAftertouch') {
          trackCCs.push({
            type: 'channelAftertouch',
            value: ccEvent.value,
            time: onsetSeconds,
          });
        } else if (ccEvent.type === 'programChange') {
          trackCCs.push({
            type: 'programChange',
            value: ccEvent.value,
            time: onsetSeconds,
          });
        } else {
          trackCCs.push({
            type: 'cc',
            number: ccEvent.number,
            value: ccEvent.value,
            time: onsetSeconds,
          });
        }
      }
    }

    trackHaps.sort((a, b) => a.time - b.time);
    for (const noteEvent of trackHaps) {
      addNoteToTrack(track, noteEvent.midiNote, {
        time: noteEvent.time,
        duration: noteEvent.duration,
        velocity: noteEvent.velocity,
        midiNote: noteEvent.midiNote,
      });
    }

    trackCCs.sort((a, b) => a.time - b.time);
    for (const ccEvent of trackCCs) {
      if (ccEvent.type === 'cc') {
        addCCToTrack(track, ccEvent.number, ccEvent.value, ccEvent.time);
      } else if (ccEvent.type === 'programChange') {
        addProgramChange(track, ccEvent.value, ccEvent.time);
      }
    }
  }

  return midi;
}

export function exportPatternToMidi(
  pattern,
  options = {},
) {
  const midi = patternToMidiEvents(pattern, options);
  return midi;
}

export function downloadPatternToMidiFile(
  pattern,
  filename = 'strudel.mid',
  options = {},
) {
  const midi = exportPatternToMidi(pattern, options);
  if (!midi) {
    return false;
  }

  downloadMidi(midi, filename);
  return true;
}

export function generateMidiExportReport(midi) {
  const report = {
    tracks: [],
    totalNotes: 0,
    totalCCEvents: 0,
    duration: midi.duration,
    header: {
      ppq: midi.header.ppq,
      tempos: midi.header.tempos,
      timeSignatures: midi.header.timeSignatures,
    },
  };

  for (let i = 0; i < midi.tracks.length; i++) {
    const track = midi.tracks[i];
    const trackReport = {
      index: i,
      name: track.name,
      channel: track.channel,
      notes: track.notes.length,
      controlChanges: {},
      instrument: track.instrument,
    };

    report.totalNotes += track.notes.length;

    for (const [ccNum, ccEvents] of Object.entries(track.controlChanges)) {
      trackReport.controlChanges[ccNum] = ccEvents.length;
      report.totalCCEvents += ccEvents.length;
    }

    report.tracks.push(trackReport);
  }

  return report;
}

export function previewExportPreview(pattern, options = {}) {
  const {
    startCycle = 0,
    endCycle = 4,
  } = options;

  if (!pattern || !pattern.queryArc) {
    return { error: 'Invalid pattern' };
  }

  const haps = pattern.queryArc(startCycle, endCycle, {});

  if (!haps || haps.length === 0) {
    return { notes: [], controlChanges: [], message: 'No events found' };
  }

  const notes = [];
  const controlChanges = [];
  const channels = new Set();

  for (const hap of haps) {
    const info = getHapInfo(hap);
    if (!info) continue;

    channels.add(info.midichan || 1);

    if (info.hasNote && info.onset) {
      let noteName;
      let midiNote;
      try {
        if (typeof info.note === 'number') {
          midiNote = Math.round(info.note);
          noteName = midiToNoteName(midiNote);
        } else {
          noteName = info.note;
          midiNote = noteToMidi(info.note);
        }
      } catch (e) {
        noteName = String(info.note);
        midiNote = null;
      }

      notes.push({
        note: noteName,
        midiNote,
        time: info.whole?.begin?.valueOf(),
        duration: info.duration.valueOf(),
        velocity: info.velocity,
        channel: info.midichan,
      });
    }

    if (hap.value.ccn !== undefined && hap.value.ccv !== undefined) {
      controlChanges.push({
        ccn: hap.value.ccn,
        ccv: hap.value.ccv,
        time: info.whole?.begin?.valueOf(),
        channel: info.midichan,
      });
    }
  }

  return {
    notes: notes.slice(0, 50),
    totalNotes: notes.length,
    controlChanges: controlChanges.slice(0, 20),
    totalCCEvents: controlChanges.length,
    channels: Array.from(channels).sort((a, b) => a - b),
    startCycle,
    endCycle,
  };
}
