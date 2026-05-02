/*
MidiTab.jsx - MIDI Import/Export UI for Strudel REPL
Copyright (C) 2025 Strudel contributors - see <https://codeberg.org/uzu/strudel/src/branch/main/website/src/repl/components/panel/MidiTab.jsx>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import cx from '@src/cx.mjs';
import { useState, useRef, useCallback, useMemo } from 'react';
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

function FormItem({ label, children, disabled, className }) {
  return (
    <div className={cx('grid gap-2 w-full', className)}>
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

const CC_MAPPING_LABELS = {
  lpf: { label: 'Low Pass Filter', defaultCC: 74, defaultMin: 0, defaultMax: 20000, defaultExp: 1 },
  cutoff: { label: 'Cutoff', defaultCC: 74, defaultMin: 0, defaultMax: 20000, defaultExp: 1 },
  resonance: { label: 'Resonance', defaultCC: 71, defaultMin: 0, defaultMax: 1, defaultExp: 1 },
  lpq: { label: 'LPQ', defaultCC: 71, defaultMin: 0, defaultMax: 1, defaultExp: 1 },
  volume: { label: 'Volume', defaultCC: 7, defaultMin: 0, defaultMax: 1, defaultExp: 1 },
  pan: { label: 'Pan', defaultCC: 10, defaultMin: 0, defaultMax: 1, defaultExp: 1 },
  expression: { label: 'Expression', defaultCC: 11, defaultMin: 0, defaultMax: 1, defaultExp: 1 },
  modulation: { label: 'Modulation', defaultCC: 1, defaultMin: 0, defaultMax: 1, defaultExp: 1 },
  sustain: { label: 'Sustain', defaultCC: 64, defaultMin: 0, defaultMax: 127, defaultExp: 1 },
  portamento: { label: 'Portamento', defaultCC: 65, defaultMin: 0, defaultMax: 127, defaultExp: 1 },
  reverb: { label: 'Reverb', defaultCC: 91, defaultMin: 0, defaultMax: 127, defaultExp: 1 },
  chorus: { label: 'Chorus', defaultCC: 93, defaultMin: 0, defaultMax: 127, defaultExp: 1 },
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

const GROUP_BY_OPTIONS = [
  { value: 'auto', label: 'Auto (Channel → Sound → Single)' },
  { value: 'midichan', label: 'By MIDI Channel' },
  { value: 'sound', label: 'By Sound Name' },
];

function getDefaultCCMapping() {
  const result = {};
  for (const [key, config] of Object.entries(CC_MAPPING_LABELS)) {
    result[key] = {
      enabled: true,
      ccn: config.defaultCC,
      min: config.defaultMin,
      max: config.defaultMax,
      exp: config.defaultExp,
    };
  }
  return result;
}

function CCMappingEditor({ mappings, onChange, disabled }) {
  const [editingKey, setEditingKey] = useState(null);

  const updateMapping = (key, field, value) => {
    const newMappings = { ...mappings };
    if (!newMappings[key]) {
      newMappings[key] = { ...CC_MAPPING_LABELS[key], enabled: true };
    }
    newMappings[key] = { ...newMappings[key], [field]: value };
    onChange(newMappings);
  };

  const toggleEnabled = (key) => {
    const newMappings = { ...mappings };
    if (!newMappings[key]) {
      newMappings[key] = { ...CC_MAPPING_LABELS[key], enabled: true };
    }
    newMappings[key] = { ...newMappings[key], enabled: !newMappings[key].enabled };
    onChange(newMappings);
  };

  const resetToDefault = (key) => {
    const config = CC_MAPPING_LABELS[key];
    if (config) {
      const newMappings = { ...mappings };
      newMappings[key] = {
        enabled: true,
        ccn: config.defaultCC,
        min: config.defaultMin,
        max: config.defaultMax,
        exp: config.defaultExp,
      };
      onChange(newMappings);
    }
  };

  return (
    <div className="space-y-3">
      {Object.entries(CC_MAPPING_LABELS).map(([key, labelConfig]) => {
        const mapping = mappings[key] || {
          enabled: false,
          ccn: labelConfig.defaultCC,
          min: labelConfig.defaultMin,
          max: labelConfig.defaultMax,
          exp: labelConfig.defaultExp,
        };
        const isEditing = editingKey === key;

        return (
          <div
            key={key}
            className={cx(
              'p-2 rounded border transition-all',
              mapping.enabled ? 'border-foreground/30 bg-lineHighlight/30' : 'border-muted bg-background'
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <Checkbox
                label={labelConfig.label}
                value={mapping.enabled}
                disabled={disabled}
                onChange={() => toggleEnabled(key)}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingKey(isEditing ? null : key)}
                  className={cx(
                    'text-xs px-2 py-0.5 rounded',
                    isEditing
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  )}
                  disabled={disabled}
                >
                  {isEditing ? 'Done' : 'Edit'}
                </button>
                <button
                  onClick={() => resetToDefault(key)}
                  className="text-xs px-2 py-0.5 rounded bg-muted text-foreground hover:bg-muted/80"
                  disabled={disabled}
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="text-xs text-muted mb-1">
              CC {mapping.ccn} | Range: {mapping.min} - {mapping.max}
              {mapping.exp !== 1 && ` | Exp: ${mapping.exp}`}
            </div>

            {isEditing && (
              <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-muted">
                <div>
                  <label className="text-xs text-muted block mb-1">CC #</label>
                  <input
                    type="number"
                    min={0}
                    max={127}
                    value={mapping.ccn}
                    onChange={(e) => updateMapping(key, 'ccn', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-full bg-background border border-muted rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Min</label>
                  <input
                    type="number"
                    step="any"
                    value={mapping.min}
                    onChange={(e) => updateMapping(key, 'min', parseFloat(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-full bg-background border border-muted rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Max</label>
                  <input
                    type="number"
                    step="any"
                    value={mapping.max}
                    onChange={(e) => updateMapping(key, 'max', parseFloat(e.target.value) || 1)}
                    disabled={disabled}
                    className="w-full bg-background border border-muted rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Exp</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={mapping.exp}
                    onChange={(e) => updateMapping(key, 'exp', parseFloat(e.target.value) || 1)}
                    disabled={disabled}
                    className="w-full bg-background border border-muted rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
    groupBy: 'auto',
    includeCC: true,
    ccMappings: getDefaultCCMapping(),
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

      const ccMapping = {};
      for (const [key, mapping] of Object.entries(exportOptions.ccMappings)) {
        if (mapping.enabled) {
          ccMapping[key] = {
            ccn: mapping.ccn,
            min: mapping.min,
            max: mapping.max,
            exp: mapping.exp,
          };
        }
      }

      const options = {
        startCycle: exportOptions.startCycle,
        endCycle: exportOptions.endCycle,
        bpm: exportOptions.bpm,
        ppq: exportOptions.ppq,
        quantization: exportOptions.quantization,
        defaultVelocity: exportOptions.defaultVelocity,
        separateTracks: exportOptions.separateTracks,
        groupBy: exportOptions.groupBy,
        ccMapping: exportOptions.includeCC ? ccMapping : {},
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

  const updateCCMappings = (newMappings) => {
    setExportOptions((prev) => ({ ...prev, ccMappings: newMappings }));
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

            <FormItem label="Track Grouping" disabled={exporting}>
              <select
                disabled={exporting}
                value={exportOptions.groupBy}
                onChange={(e) => updateExportOption('groupBy', e.target.value)}
                className="bg-background text-foreground border border-muted rounded p-2 w-full"
              >
                {GROUP_BY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-muted text-xs mt-1">
                Auto: Separate by MIDI channel if set (.midichan()), otherwise by sound name (.s()), otherwise single track.
                Different voices in stack() with different .s() or .midichan() will be in separate tracks.
              </p>
            </FormItem>

            <div className="space-y-2">
              <Checkbox
                label="Export CC events"
                value={exportOptions.includeCC}
                disabled={exporting}
                onChange={(e) => updateExportOption('includeCC', e.target.checked)}
              />
            </div>

            {exportOptions.includeCC && (
              <>
                <SectionHeader>CC Mapping Configuration</SectionHeader>
                <p className="text-muted text-sm mb-2">
                  Map Strudel control names to MIDI CC numbers with custom range normalization.
                  Click "Edit" to customize CC number, min/max range, and exponent curve.
                </p>

                <div className="bg-lineHighlight/50 p-3 rounded text-xs space-y-1 mb-3">
                  <p className="font-medium text-foreground">CC Export Examples:</p>
                  <p>• <code className="text-muted">.ccn(1).ccv(0.5)</code> → CC 1, value 64 (0.5 * 127)</p>
                  <p>• <code className="text-muted">.lpf(10000)</code> → CC 74, value 64 (10000/20000 = 0.5)</p>
                  <p>• <code className="text-muted">.resonance(0.5)</code> → CC 71, value 64 (0.5 * 127)</p>
                  <p>• <code className="text-muted">.midimap('mymap')</code> → Use custom mapping with min/max/exp</p>
                </div>

                <div className="max-h-80 overflow-y-auto pr-2">
                  <CCMappingEditor
                    mappings={exportOptions.ccMappings}
                    onChange={updateCCMappings}
                    disabled={exporting}
                  />
                </div>
              </>
            )}

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

                <div className="bg-lineHighlight/50 p-3 rounded text-xs space-y-1">
                  <p className="font-medium text-foreground">Import Notes:</p>
                  <p>• CC values are converted from MIDI 0-127 to 0-1 range for .ccv()</p>
                  <p>• Example: CC 64 → .ccv(0.5039) (4 decimal places for precision)</p>
                  <p>• Re-exporting should preserve the original CC values</p>
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
