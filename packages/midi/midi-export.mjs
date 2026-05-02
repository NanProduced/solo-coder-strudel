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
  lpf: { ccn: 74, min: 0, max: 20000 },
  cutoff: { ccn: 74, min: 0, max: 20000 },
  resonance: { ccn: 71, min: 0, max: 1 },
  lpq: { ccn: 71, min: 0, max: 1 },
  volume: { ccn: 7, min: 0, max: 1 },
  pan: { ccn: 10, min: 0, max: 1 },
  expression: { ccn: 11, min: 0, max: 1 },
  modulation: { ccn: 1, min: 0, max: 1 },
  sustain: { ccn: 64, min: 0, max: 127 },
  portamento: { ccn: 65, min: 0, max: 127 },
  reverb: { ccn: 91, min: 0, max: 127 },
  chorus: { ccn: 93, min: 0, max: 127 },
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
  groupBy: 'auto',
};

function getCCMapping(customMapping = {}) {
  const result = {};
  for (const [key, value] of Object.entries(DEFAULT_CC_MAPPING)) {
    result[key] = typeof value === 'object' ? { ...value } : { ccn: value, min: 0, max: 1 };
  }
  for (const [key, value] of Object.entries(customMapping)) {
    if (typeof value === 'number') {
      result[key] = { ccn: value, min: 0, max: 1 };
    } else if (typeof value === 'object') {
      result[key] = { ...result[key], ...value };
    }
  }
  return result;
}

function normalizeCCValue(value, config = {}) {
  const { min = 0, max = 1, exp = 1 } = config;
  if (min === max) {
    return 0;
  }
  let normalized = (value - min) / (max - min);
  normalized = Math.min(1, Math.max(0, normalized));
  if (exp !== 1) {
    normalized = Math.pow(normalized, exp);
  }
  return Math.round(normalized * 127);
}

function getMidiCCFromHapValue(hapValue, ccMapping, midimapName) {
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

  let midimapCCs = {};
  if (midimapName && midicontrolMap.has(midimapName)) {
    midimapCCs = midicontrolMap.get(midimapName);
  }

  for (const [controlName, defaultConfig] of Object.entries(ccMapping)) {
    if (hapValue[controlName] !== undefined) {
      const value = hapValue[controlName];
      if (typeof value === 'number') {
        const midimapConfig = midimapCCs[controlName];
        let useConfig = defaultConfig;
        
        if (midimapConfig) {
          if (typeof midimapConfig === 'number') {
            useConfig = { ccn: midimapConfig, min: 0, max: 1 };
          } else if (typeof midimapConfig === 'object') {
            useConfig = { ...defaultConfig, ...midimapConfig };
          }
        }

        const scaledValue = normalizeCCValue(value, useConfig);
        ccEvents.push({
          number: useConfig.ccn,
          value: scaledValue,
        });
      }
    }
  }

  for (const [controlName, config] of Object.entries(midimapCCs)) {
    if (ccMapping[controlName] !== undefined) {
      continue;
    }
    if (hapValue[controlName] !== undefined) {
      const value = hapValue[controlName];
      if (typeof value === 'number') {
        let useConfig;
        if (typeof config === 'number') {
          useConfig = { ccn: config, min: 0, max: 1 };
        } else if (typeof config === 'object' && config.ccn !== undefined) {
          useConfig = config;
        } else {
          continue;
        }
        const scaledValue = normalizeCCValue(value, useConfig);
        ccEvents.push({
          number: useConfig.ccn,
          value: scaledValue,
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

  if (value.s !== undefined) {
    info.sound = value.s;
  }

  if (value.midimap !== undefined) {
    info.midimap = value.midimap;
  }

  return info;
}

function getTrackKey(hapInfo, groupBy = 'auto') {
  if (groupBy === 'midichan' || (groupBy === 'auto' && hapInfo.midichan !== 1)) {
    return `midichan_${hapInfo.midichan}`;
  }
  if (groupBy === 'sound' || (groupBy === 'auto' && hapInfo.sound)) {
    return `sound_${hapInfo.sound}`;
  }
  return 'default';
}

function groupHapsForExport(haps, options = {}) {
  const { groupBy = 'auto' } = options;
  const groups = new Map();

  for (const hap of haps) {
    const hapInfo = getHapInfo(hap);
    if (!hapInfo) continue;

    const trackKey = getTrackKey(hapInfo, groupBy);
    if (!groups.has(trackKey)) {
      groups.set(trackKey, []);
    }
    groups.get(trackKey).push({ hap, hapInfo });
  }

  return groups;
}

function getTrackName(trackKey, index) {
  if (trackKey.startsWith('midichan_')) {
    const channel = trackKey.replace('midichan_', '');
    return `Channel ${channel}`;
  }
  if (trackKey.startsWith('sound_')) {
    const sound = trackKey.replace('sound_', '');
    return `Sound: ${sound}`;
  }
  return `Track ${index + 1}`;
}

function getTrackChannel(trackKey, defaultChannel = 1) {
  if (trackKey.startsWith('midichan_')) {
    return parseInt(trackKey.replace('midichan_', ''), 10);
  }
  return defaultChannel;
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
    groupBy = 'auto',
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
    groupedHaps = groupHapsForExport(haps, { groupBy });
  } else {
    const mappedHaps = haps.map(function(h) {
      return { hap: h, hapInfo: getHapInfo(h) };
    }).filter(item => item.hapInfo !== null);
    groupedHaps = new Map();
    groupedHaps.set('default', mappedHaps);
  }

  const trackKeys = Array.from(groupedHaps.keys());
  const channelToTrack = new Map();
  let trackIndex = 0;

  for (const trackKey of trackKeys) {
    const channelEvents = groupedHaps.get(trackKey);
    const trackName = getTrackName(trackKey, trackIndex);
    const trackChannel = getTrackChannel(trackKey, defaultMidichan);
    const midiChannel = trackChannel - 1;

    const track = createMidiTrack(midi, trackName, midiChannel);
    channelToTrack.set(trackKey, track);
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

      const ccEvents = getMidiCCFromHapValue(hap.value, finalCCMapping, hapInfo.midimap);
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
    groupBy = 'auto',
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
  const tracks = new Map();

  for (const hap of haps) {
    const info = getHapInfo(hap);
    if (!info) continue;

    const trackKey = getTrackKey(info, groupBy);
    if (!tracks.has(trackKey)) {
      tracks.set(trackKey, {
        key: trackKey,
        name: getTrackName(trackKey, tracks.size),
        channel: getTrackChannel(trackKey),
        notes: [],
      });
    }
    const track = tracks.get(trackKey);

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

      const noteInfo = {
        note: noteName,
        midiNote,
        time: info.whole?.begin?.valueOf(),
        duration: info.duration.valueOf(),
        velocity: info.velocity,
        channel: info.midichan,
        track: track.name,
      };
      notes.push(noteInfo);
      track.notes.push(noteInfo);
    }

    if (hap.value.ccn !== undefined && hap.value.ccv !== undefined) {
      controlChanges.push({
        ccn: hap.value.ccn,
        ccv: hap.value.ccv,
        time: info.whole?.begin?.valueOf(),
        channel: info.midichan,
        track: track.name,
      });
    }
  }

  return {
    tracks: Array.from(tracks.values()),
    notes: notes.slice(0, 50),
    totalNotes: notes.length,
    controlChanges: controlChanges.slice(0, 20),
    totalCCEvents: controlChanges.length,
    startCycle,
    endCycle,
    groupBy,
  };
}
