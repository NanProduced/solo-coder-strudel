/*
MidiTab.jsx - MIDI Import/Export UI for Strudel REPL
Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/website/src/repl/components/panel/MidiTab.jsx>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import cx from '@src/cx.mjs';
import { useState, useRef, useCallback } from 'react';
import { Textbox } from '@src/repl/components/panel/SettingsTab';
import {
  DEFAULT_CC_MAPPING,
  DEFAULT_IMPORT_OPTIONS,
  DEFAULT_EXPORT_OPTIONS,
} from '@strudel/midi';

function Checkbox({ label, value, onChange, disabled = false }) {
  return (
    <label className={cx(disabled && 'opacity-50')}>
      <input disabled={disabled} type="checkbox" checked={value} onChange={onChange} />
      {' ' + label}
    </label>
  );
}

function FormItem({ label, children, disabled }) {
  return (
    <div className="grid gap-2 w-full">
      <label className={cx(disabled && 'opacity-50')}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <h3 className="text-foreground font-semibold text-sm mt-4 mb-2 border-b border-muted pb-1">
      {children}
    </h3>
  );
}

function TabButton({ label, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'px-4 py-2 text-sm transition-colors cursor-pointer',
        isSelected
          ? 'bg-lineHighlight text-foreground border-b-2 border-foreground'
          : 'text-muted hover:text-foreground hover:bg-lineHighlight/50'
      )}
    >
      {label}
    </button>
  );
}

const DEFAULT_CC_MAPPING_LABELS = {
  lpf: 'Low Pass Filter (74)',
  cutoff: 'Cutoff (74)',
  resonance: 'Resonance (71)',
  volume: 'Volume (7)',
  pan: 'Pan (10)',
  expression: 'Expression (11)',
  modulation: 'Modulation (1)',
  sustain: 'Sustain (64)',
  portamento: 'Portamento (65)',
  reverb: 'Reverb (91)',
  chorus: 'Chorus (93)',
};

const QUANTIZATION_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 0.125, label: '1/32 note' },
  { value: 0.25, label: '1/16 note' },
  { value: 0.5, label: '1/8 note' },
  { value: 1, label: '1/4 note' },
  { value: 2, label: '1/2 note' },
  { value: 4, label: '1 bar' },
];

export default function MidiTab({ context }) {
  const [activeTab, setActiveTab] = useState('export');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  const [exportOptions, setExportOptions] = useState({
    filename: '',
    startCycle: 0,
    endCycle: 4,
    bpm: 120,
    ppq: 480,
    quantization: 0,
    defaultVelocity: 0.9,
    separateTracks: true,
    includeCC: true,
    ccMapping: { ...DEFAULT_CC_MAPPING },
  });

  const [importOptions, setImportOptions] = useState({
    bpm: 120,
    quantization: 0.25,
    velocityThreshold: 0,
    includeCC: true,
    separateTracks: true,
    usePatternSyntax: false,
  });

  const handleExport = useCallback(async () => {
    if (!context.editorRef?.current?.repl?.state?.pattern) {
      alert('No pattern to export. Please run your code first.');
      return;
    }

    setExporting(true);

    try {
      const pattern = context.editorRef.current.repl.state.pattern;
      const {
        downloadPatternToMidiFile,
      } = await import('@strudel/midi');

      const filename = exportOptions.filename || `strudel_${Date.now()}.mid`;

      const options = {
        startCycle: exportOptions.startCycle,
        endCycle: exportOptions.endCycle,
        bpm: exportOptions.bpm,
        ppq: exportOptions.ppq,
        quantization: exportOptions.quantization,
        defaultVelocity: exportOptions.defaultVelocity,
        separateTracks: exportOptions.separateTracks,
        ccMapping: exportOptions.includeCC ? exportOptions.ccMapping : {},
      };

      downloadPatternToMidiFile(pattern, filename, options);
      console.log('MIDI export complete:', filename);
    } catch (error) {
      console.error('MIDI export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  }, [context, exportOptions]);

  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const { importMidiFile, midiToPreview } = await import('@strudel/midi');

      const result = await importMidiFile(file, {
        bpm: importOptions.bpm,
        quantization: importOptions.quantization,
        velocityThreshold: importOptions.velocityThreshold,
        includeCC: importOptions.includeCC,
        separateTracks: importOptions.separateTracks,
        usePatternSyntax: importOptions.usePatternSyntax,
      });

      const preview = midiToPreview(result.parsed);
      setImportResult({ ...result, preview });
    } catch (error) {
      console.error('MIDI import failed:', error);
      setImportError(error.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [importOptions]);

  const handleApplyImportedCode = useCallback(() => {
    if (!importResult?.strudelCode?.code) return;

    if (context.editorRef?.current) {
      context.editorRef.current.setCode(importResult.strudelCode.code);
      console.log('Imported code applied to editor');
    }
  }, [importResult, context]);

  const updateExportOption = (key, value) => {
    setExportOptions((prev) => ({ ...prev, [key]: value }));
  };

  const updateImportOption = (key, value) => {
    setImportOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="text-foreground w-full">
      <div className="flex border-b border-muted">
        <TabButton
          label="Export MIDI"
          isSelected={activeTab === 'export'}
          onClick={() => setActiveTab('export')}
        />
        <TabButton
          label="Import MIDI"
          isSelected={activeTab === 'import'}
          onClick={() => setActiveTab('import')}
        />
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'export' && (
          <>
            <SectionHeader>Export Settings</SectionHeader>

            <FormItem label="File name (optional)" disabled={exporting}>
              <Textbox
                placeholder="strudel.mid"
                disabled={exporting}
                value={exportOptions.filename}
                onChange={(v) => updateExportOption('filename', v)}
              />
            </FormItem>

            <div className="flex flex-row gap-4 w-full">
              <FormItem label="Start cycle" disabled={exporting}>
                <Textbox
                  type="number"
                  min={0}
                  value={exportOptions.startCycle}
                  disabled={exporting}
                  onChange={(v) => updateExportOption('startCycle', parseInt(v) || 0)}
                />
              </FormItem>
              <FormItem label="End cycle" disabled={exporting}>
                <Textbox
                  type="number"
                  min={1}
                  value={exportOptions.endCycle}
                  disabled={exporting}
                  onChange={(v) => updateExportOption('endCycle', parseInt(v) || 4)}
                />
              </FormItem>
            </div>

            <div className="flex flex-row gap-4">
              <FormItem label="BPM" disabled={exporting}>
                <Textbox
                  type="number"
                  min={1}
                  max={300}
                  value={exportOptions.bpm}
                  disabled={exporting}
                  onChange={(v) => updateExportOption('bpm', parseInt(v) || 120)}
                />
              </FormItem>
              <FormItem label="PPQ (Resolution)" disabled={exporting}>
                <Textbox
                  type="number"
                  min={96}
                  max={1920}
                  value={exportOptions.ppq}
                  disabled={exporting}
                  onChange={(v) => updateExportOption('ppq', parseInt(v) || 480)}
                />
              </FormItem>
            </div>

            <FormItem label="Quantization" disabled={exporting}>
              <select
                disabled={exporting}
                value={exportOptions.quantization}
                onChange={(e) => updateExportOption('quantization', parseFloat(e.target.value))}
                className="bg-background text-foreground border border-muted rounded p-2 w-full"
              >
                {QUANTIZATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormItem>

            <div className="space-y-2">
              <Checkbox
                label="Export CC events"
                value={exportOptions.includeCC}
                disabled={exporting}
                onChange={(e) => updateExportOption('includeCC', e.target.checked)}
              />
              <Checkbox
                label="Separate tracks by MIDI channel"
                value={exportOptions.separateTracks}
                disabled={exporting}
                onChange={(e) => updateExportOption('separateTracks', e.target.checked)}
              />
            </div>

            <SectionHeader>CC Mapping</SectionHeader>
            <p className="text-muted text-sm mb-2">
              Map Strudel control names to MIDI CC numbers. These controls will be exported as CC events.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(DEFAULT_CC_MAPPING_LABELS).map(([control, label]) => (
                <div key={control} className="flex items-center gap-2">
                  <Checkbox
                    label={label}
                    value={exportOptions.ccMapping[control] !== undefined}
                    disabled={exporting || !exportOptions.includeCC}
                    onChange={(e) => {
                      setExportOptions((prev) => {
                        const newMapping = { ...prev.ccMapping };
                        if (e.target.checked) {
                          newMapping[control] = DEFAULT_CC_MAPPING[control];
                        } else {
                          delete newMapping[control];
                        }
                        return { ...prev, ccMapping: newMapping };
                      });
                    }}
                  />
                </div>
              ))}
            </div>

            <button
              className={cx(
                'bg-background p-3 w-full rounded-md hover:opacity-75 font-medium',
                exporting && 'opacity-50 cursor-not-allowed'
              )}
              disabled={exporting}
              onClick={handleExport}
            >
              {exporting ? 'Exporting...' : 'Export to MIDI File'}
            </button>
          </>
        )}

        {activeTab === 'import' && (
          <>
            <SectionHeader>Import Settings</SectionHeader>

            <FormItem label="BPM" disabled={importing}>
              <Textbox
                type="number"
                min={1}
                max={300}
                value={importOptions.bpm}
                disabled={importing}
                onChange={(v) => updateImportOption('bpm', parseInt(v) || 120)}
              />
            </FormItem>

            <FormItem label="Quantization" disabled={importing}>
              <select
                disabled={importing}
                value={importOptions.quantization}
                onChange={(e) => updateImportOption('quantization', parseFloat(e.target.value))}
                className="bg-background text-foreground border border-muted rounded p-2 w-full"
              >
                {QUANTIZATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FormItem>

            <div className="space-y-2">
              <Checkbox
                label="Import CC events"
                value={importOptions.includeCC}
                disabled={importing}
                onChange={(e) => updateImportOption('includeCC', e.target.checked)}
              />
              <Checkbox
                label="Separate tracks (using $a, $b, ...)"
                value={importOptions.separateTracks}
                disabled={importing}
                onChange={(e) => updateImportOption('separateTracks', e.target.checked)}
              />
              <Checkbox
                label="Use Pattern API syntax (instead of mini notation)"
                value={importOptions.usePatternSyntax}
                disabled={importing}
                onChange={(e) => updateImportOption('usePatternSyntax', e.target.checked)}
              />
            </div>

            <SectionHeader>Select MIDI File</SectionHeader>

            <input
              ref={fileInputRef}
              type="file"
              accept=".mid,.midi"
              onChange={handleFileSelect}
              disabled={importing}
              className="w-full p-2 border border-muted rounded bg-background text-foreground cursor-pointer"
            />

            {importing && (
              <div className="text-center py-4">
                <div className="animate-pulse">Importing MIDI file...</div>
              </div>
            )}

            {importError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Import Error:</strong> {importError}
              </div>
            )}

            {importResult && (
              <>
                <SectionHeader>Import Preview</SectionHeader>

                <div className="bg-lineHighlight p-3 rounded space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">File:</span>
                    <span>{importResult.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tracks:</span>
                    <span>{importResult.preview.tracks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total Notes:</span>
                    <span>{importResult.preview.totalNotes}</span>
                  </div>
                  {importResult.preview.totalCCEvents > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">CC Events:</span>
                      <span>{importResult.preview.totalCCEvents}</span>
                    </div>
                  )}
                </div>

                <SectionHeader>Tracks</SectionHeader>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {importResult.preview.tracks.map((track, i) => (
                    <div key={i} className="bg-lineHighlight p-2 rounded text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{track.name || `Track ${i + 1}`}</span>
                        <span className="text-muted">
                          {track.noteCount} notes
                          {track.ccCount > 0 && `, ${track.ccCount} CC`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <SectionHeader>Generated Code</SectionHeader>
                <div className="bg-lineHighlight p-3 rounded">
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-60">
                    {importResult.strudelCode.code}
                  </pre>
                </div>

                <button
                  className="bg-background p-3 w-full rounded-md hover:opacity-75 font-medium"
                  onClick={handleApplyImportedCode}
                >
                  Apply to Editor
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
