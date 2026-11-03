// The download package of docs/app/ddd.md §5.9: `buildPackage(input,
// stamps, generatedAt)`, a pure function of the `RenderInput` of the last
// committed frame, the page's version stamps (§6.2), the one instant the
// handler read, and the §5.13 configuration. It returns the archive's
// file name and bytes: one stored ZIP (`zip.ts`) of the members
// `records.csv`, `statistics.csv`, `provenance.txt`, and `scenario.json`,
// in that order, each UTF-8 without a byte-order mark through
// `TextEncoder`.
//
// Consistency invariant (§5.9): everything comes from the one
// `RenderInput` — its engine result, its Scenario snapshot, its `Vintage`
// and, in offset mode, its `windows` and `flags` — so a package never
// combines current settings with previous results. Its `field` rows are
// never read (PDD §6.1: field measurements are not part of the download).
// Provenance block 8, the file name's `{date}`, and every ZIP timestamp
// use the one `generatedAt`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import * as config from '../config';
import { canonicalJson, serializeScenario } from '../state/scenario-json';
import { MEASUREMENT_NAMES } from '../state/state';
import { fillCopy, measurementLabel } from '../views/chart-text';
import { copyText } from '../views/copy';
import { formatCount } from '../views/format';
import { noticeText, selectNotices } from '../views/notices';
import type { RenderInput } from '../views/render-input';
import { settingsText, populationText, type SummaryState } from '../views/summary';
import { recordsCsv, statisticsCsv } from './csv';
import { downloadFileName } from './file-name';
import { zip } from './zip';

/**
 * The page's version stamps (§6.2), read from the `#gre-app` dataset at
 * mount: `data-software-version` and `data-data-version`. The package's
 * data-export version is the loaded manifest's `export_version` (§5.9),
 * which the §6.2 runtime check has found equal to `dataVersion`.
 */
export interface VersionStamps {
  readonly softwareVersion: string;
  readonly dataVersion: string;
}

/** One package member before encoding: its name and its text. */
export interface PackageText {
  readonly name: string;
  readonly text: string;
}

/** What `buildPackage` returns (§5.9). */
export interface DownloadPackage {
  /** The DD-6 file name, `.zip` appended. */
  readonly fileName: string;
  /** The stored ZIP archive. */
  readonly bytes: Uint8Array;
}

/** The four members, in package order (§5.9). */
export const PACKAGE_MEMBER_NAMES = ['records.csv', 'statistics.csv', 'provenance.txt', 'scenario.json'] as const;

/** The `scenario.json` schema version (§5.9). */
const SCENARIO_JSON_SCHEMA_VERSION = 1;

/** `generatedAt` as `YYYY-MM-DDTHH:MM:SSZ`, from its UTC fields (§5.9, block 8). */
export function utcInstant(generatedAt: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  const year = String(generatedAt.getUTCFullYear()).padStart(4, '0');
  return (
    `${year}-${two(generatedAt.getUTCMonth() + 1)}-${two(generatedAt.getUTCDate())}` +
    `T${two(generatedAt.getUTCHours())}:${two(generatedAt.getUTCMinutes())}:${two(generatedAt.getUTCSeconds())}Z`
  );
}

/** A registry text for a plain-text use: its `**` emphasis markers dropped (§5.8, Copy registry). */
function plainText(text: string): string {
  return text.split('**').join('');
}

/**
 * Provenance block 9 (§5.9): one line per entry of the `caveats` that
 * `selectNotices(input, cfg)` returns for this `RenderInput`, each the
 * registry text with its slots filled as the page fills them and its
 * `**` markers dropped; the line `none` for an empty list.
 */
function caveatLines(input: RenderInput): string[] {
  const caveats = selectNotices(input, config).caveats;
  if (caveats.length === 0) return [copyText('ddd5.9.noCaveats')];
  return caveats.map((ref) => plainText(noticeText(ref)));
}

/**
 * `provenance.txt` (§5.9): the nine blocks in the PDD §6.1 order, each
 * its label line, its content lines, and one empty line, every line
 * ending in LF.
 */
export function provenanceText(input: RenderInput, stamps: VersionStamps, generatedAt: Date): string {
  const manifest = input.vintage.manifest;
  const state: SummaryState = { scenario: input.scenario, manifest };
  const selection = input.selection;
  const blocks: readonly (readonly [labelKey: string, lines: readonly string[]])[] = [
    ['ddd5.9.labelPaperCitation', [copyText('ddd5.9.paperCitation')]],
    ['ddd5.9.labelDesignSafeDois', [copyText('ddd5.9.doiHomogeneous'), copyText('ddd5.9.doiHeterogeneous')]],
    ['ddd5.9.labelSoftwareVersion', [stamps.softwareVersion]],
    [
      'ddd5.9.labelDataExport',
      [fillCopy('ddd5.9.dataExportLine', { export_version: manifest.exportVersion, export_date: manifest.exportDate })],
    ],
    ['ddd5.9.labelScenarioSettings', [settingsText(state)]],
    ['ddd5.9.labelPopulation', [populationText(state)]],
    [
      'ddd5.9.labelCounts',
      [
        fillCopy('ddd5.9.countsMatchingLine', { count: formatCount(selection.matchingRecords) }),
        ...MEASUREMENT_NAMES.map((m) =>
          fillCopy('ddd5.9.countsPanelLine', {
            label: measurementLabel(m),
            N: formatCount(selection.perMeasurement[m].valid),
          }),
        ),
      ],
    ],
    ['ddd5.9.labelGenerated', [utcInstant(generatedAt)]],
    ['ddd5.9.labelCaveats', caveatLines(input)],
  ];
  return blocks.map(([labelKey, lines]) => [copyText(labelKey), ...lines, ''].map((line) => `${line}\n`).join('')).join('');
}

/** One `converted_windows` entry (§5.9). */
interface ConvertedWindowJson {
  readonly fault_dip: number;
  readonly window_lo: number;
  readonly window_hi: number;
  readonly range_flag: string;
}

/**
 * `converted_windows` (§5.9): null in slip mode; in offset mode one
 * `{fault_dip, window_lo, window_hi, range_flag}` per selected dip in
 * ascending order — that dip's `lo` and `hi` in `windows` and its
 * `rangeFlag` in `flags`. Throws when either lacks a selected dip.
 */
function convertedWindows(input: RenderInput): readonly ConvertedWindowJson[] | null {
  if (input.scenario.window.mode === 'slip') return null;
  const { windows, flags } = input;
  if (windows === null || flags === null) {
    throw new Error('package: an offset-mode RenderInput carries no windows or flags');
  }
  return [...input.scenario.faultDip]
    .sort((a, b) => a - b)
    .map((dip) => {
      const w = windows.find((entry) => entry.faultDip === dip);
      const f = flags.find((entry) => entry.faultDip === dip);
      if (w === undefined || f === undefined) {
        throw new Error(`package: no converted window or range flag for the selected fault dip ${dip}`);
      }
      return { fault_dip: dip, window_lo: w.lo, window_hi: w.hi, range_flag: f.rangeFlag };
    });
}

/**
 * `scenario.json` (§5.9; DD-11): `canonicalJson` of `{schema_version: 1,
 * software_version, export_version, scenario, converted_windows}` plus
 * one LF — `scenario` the canonical scenario object of the snapshot,
 * `JSON.parse(serializeScenario(snapshot, manifest))`; the floats of
 * `converted_windows` as `Number.prototype.toString` writes them, which
 * is the number form of `canonicalJson`.
 */
export function scenarioJsonText(input: RenderInput, stamps: VersionStamps): string {
  const manifest = input.vintage.manifest;
  return (
    canonicalJson({
      schema_version: SCENARIO_JSON_SCHEMA_VERSION,
      software_version: stamps.softwareVersion,
      export_version: manifest.exportVersion,
      scenario: JSON.parse(serializeScenario(input.scenario, manifest)),
      converted_windows: convertedWindows(input),
    }) + '\n'
  );
}

/** The four members' texts, in package order (§5.9). */
export function packageTexts(input: RenderInput, stamps: VersionStamps, generatedAt: Date): readonly PackageText[] {
  return [
    { name: PACKAGE_MEMBER_NAMES[0], text: recordsCsv(input.selection, input.vintage) },
    { name: PACKAGE_MEMBER_NAMES[1], text: statisticsCsv(input, config) },
    { name: PACKAGE_MEMBER_NAMES[2], text: provenanceText(input, stamps, generatedAt) },
    { name: PACKAGE_MEMBER_NAMES[3], text: scenarioJsonText(input, stamps) },
  ];
}

/**
 * The download package of `input` (§5.9): the DD-6 file name and the
 * stored ZIP of the four members, each UTF-8 without a byte-order mark,
 * every timestamp `generatedAt`.
 */
export function buildPackage(input: RenderInput, stamps: VersionStamps, generatedAt: Date): DownloadPackage {
  const encoder = new TextEncoder();
  const members = packageTexts(input, stamps, generatedAt).map((m) => ({ name: m.name, bytes: encoder.encode(m.text) }));
  return {
    fileName: downloadFileName(input.scenario, input.vintage.manifest, generatedAt),
    bytes: zip(members, generatedAt),
  };
}
