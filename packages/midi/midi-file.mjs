/*
midi-file.mjs - MIDI file read/write core functionality
Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/packages/midi/midi-file.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { Midi } from '@tonejs/midi';
import { noteToMidi, valueToMidi } from '@strudel/core';

export const DEFAULT_PPQ = 480;
export const DEFAULT_BPM = 120;
export const DEFAULT_TICKS_PER_QUARTER = 480;

export const CC_NAME_MAP = {
  bankSelect: 0,
  modulation: 1,
  breath: 2,
  footController: 4,
  portamentoTime: 5,
  dataEntry: 6,
  volume: 7,
  balance: 8,
  pan: 10,
  expression: 11,
  effectControl1: 12,
  effectControl2: 13,
  generalPurpose1: 16,
  generalPurpose2: 17,
  generalPurpose3: 18,
  generalPurpose4: 19,
  sustain: 64,
  portamento: 65,
  sostenuto: 66,
  softPedal: 67,
  legatoFootswitch: 68,
  hold2: 69,
  soundVariation: 70,
  timbre: 71,
  releaseTime: 72,
  attackTime: 73,
  brightness: 74,
  decayTime: 75,
  vibratoRate: 76,
  vibratoDepth: 77,
  vibratoDelay: 78,
  soundController10: 79,
  generalPurpose5: 80,
  generalPurpose6: 81,
  generalPurpose7: 82,
  generalPurpose8: 83,
  portamentoControl: 84,
  velocityPrefix: 88,
  effects1Depth: 91,
  effects2Depth: 92,
  effects3Depth: 93,
  effects4Depth: 94,
  effects5Depth: 95,
  dataIncrement: 96,
  dataDecrement: 97,
  nrpnLSB: 98,
  nrpnMSB: 99,
  rpnLSB: 100,
  rpnMSB: 101,
  allSoundOff: 120,
  resetAllControllers: 121,
  localControl: 122,
  allNotesOff: 123,
  omniModeOff: 124,
  omniModeOn: 125,
  monoModeOn: 126,
  polyModeOn: 127,
  lpf: 74,
  cutoff: 74,
  resonance: 71,
  lpq: 71,
};

export const getCCNumber = (nameOrNumber) => {
  if (typeof nameOrNumber === 'number') {
    return nameOrNumber;
  }
  const lowerName = nameOrNumber.toLowerCase();
  if (CC_NAME_MAP[lowerName] !== undefined) {
    return CC_NAME_MAP[lowerName];
  }
  if (lowerName.startsWith('cc')) {
    const num = parseInt(lowerName.slice(2), 10);
    if (!isNaN(num) && num >= 0 && num <= 127) {
      return num;
    }
  }
  return null;
};

export function createEmptyMidi(options = {}) {
  const { ppq = DEFAULT_PPQ, bpm = DEFAULT_BPM, timeSignature = [4, 4] } = options;
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature,
  });
  midi.header.ppq = ppq;
  return midi;
}

export function createMidiTrack(midi, name = 'Track 1', channel = 0) {
  const track = midi.addTrack();
  track.name = name;
  track.channel = channel;
  return track;
}

export function addNoteToTrack(track, note, options = {}) {
  const {
    time = 0,
    duration = 0.25,
    velocity = 0.9,
    midiNote = null,
  } = options;

  let midiNum = midiNote;
  if (midiNum === null) {
    if (typeof note === 'number') {
      midiNum = note;
    } else if (typeof note === 'string') {
      midiNum = noteToMidi(note);
    } else if (typeof note === 'object' && note !== null) {
      try {
        midiNum = valueToMidi(note);
      } catch (e) {
        console.warn('Could not convert note to MIDI:', note);
        return null;
      }
    } else {
      return null;
    }
  }

  if (midiNum < 0 || midiNum > 127) {
    console.warn('MIDI note number out of range:', midiNum);
    return null;
  }

  const clampedVelocity = Math.max(0, Math.min(1, velocity));

  track.addNote({
    midi: midiNum,
    time,
    duration,
    velocity: clampedVelocity,
  });

  return track;
}

export function addCCToTrack(track, ccNumber, value, time = 0) {
  let ccNum = getCCNumber(ccNumber);
  if (ccNum === null) {
    console.warn('Invalid CC number or name:', ccNumber);
    return null;
  }

  const clampedValue = Math.max(0, Math.min(127, Math.round(value)));
  track.addCC({
    number: ccNum,
    value: clampedValue,
    time,
  });

  return track;
}

export function addProgramChange(track, programNumber, time = 0) {
  if (programNumber < 0 || programNumber > 127) {
    console.warn('Program number out of range:', programNumber);
    return null;
  }
  track.addProgramChange({
    number: programNumber,
    time,
  });
  return track;
}

export function midiToByteArray(midi) {
  return midi.toArray();
}

export function byteArrayToMidi(byteArray) {
  return new Midi(byteArray);
}

export function downloadMidi(midi, filename = 'strudel.mid') {
  const byteArray = midiToByteArray(midi);
  const blob = new Blob([byteArray], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function loadMidiFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        const midi = new Midi(arrayBuffer);
        resolve(midi);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function cyclesToSeconds(cycles, bpm = DEFAULT_BPM, beatsPerCycle = 4) {
  const beatsPerSecond = bpm / 60;
  const secondsPerBeat = 1 / beatsPerSecond;
  return cycles * beatsPerCycle * secondsPerBeat;
}

export function secondsToCycles(seconds, bpm = DEFAULT_BPM, beatsPerCycle = 4) {
  const beatsPerSecond = bpm / 60;
  const secondsPerBeat = 1 / beatsPerSecond;
  return seconds / (beatsPerCycle * secondsPerBeat);
}

export function cyclesToTicks(cycles, bpm = DEFAULT_BPM, ppq = DEFAULT_PPQ, beatsPerCycle = 4) {
  const beats = cycles * beatsPerCycle;
  return Math.round(beats * ppq);
}

export function ticksToCycles(ticks, bpm = DEFAULT_BPM, ppq = DEFAULT_PPQ, beatsPerCycle = 4) {
  const beats = ticks / ppq;
  return beats / beatsPerCycle;
}

export function quantizeValue(value, grid) {
  return Math.round(value / grid) * grid;
}

export function quantizeTime(time, quantization = 0.25) {
  return quantizeValue(time, quantization);
}

export function normalizeVelocity(velocity) {
  if (typeof velocity === 'number') {
    if (velocity <= 1 && velocity >= 0) {
      return velocity;
    }
    if (velocity > 1 && velocity <= 127) {
      return velocity / 127;
    }
  }
  return 0.9;
}

export function midiToNoteName(midiNumber, options = {}) {
  const { sharps = false, pitchClass = false } = options;
  const pcs = sharps
    ? ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    : ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const octave = Math.floor(midiNumber / 12) - 1;
  const pc = pcs[midiNumber % 12];
  if (pitchClass) {
    return pc;
  }
  return pc + octave;
}

export function getMidiTempo(midi) {
  if (midi.header.tempos && midi.header.tempos.length > 0) {
    return midi.header.tempos[0].bpm;
  }
  return DEFAULT_BPM;
}

export function getMidiTimeSignature(midi) {
  if (midi.header.timeSignatures && midi.header.timeSignatures.length > 0) {
    return midi.header.timeSignatures[0].timeSignature;
  }
  return [4, 4];
}
