// Short, plain-language definitions for the guided page. Each source is
// an existing glossary anchor; longer explanations remain linked in the UI.
// Percentiles generalize the glossary's ordered-measurement explanation
// of quartiles and the median; their displayed values use the shared core.
export const DEFINITIONS = {
  faultDip: {
    source: 'fault-dip',
    text: 'How steeply the fault is tilted, measured in degrees from horizontal. A smaller angle describes a shallower fault.',
  },
  depth: {
    source: 'sediment-depth',
    text: 'The thickness of the sediment above bedrock.',
  },
  density: {
    source: 'sediment-strength',
    text: 'How tightly packed the sediment is. Density and strength describe different properties of the sediment.',
  },
  sediment: {
    source: 'set',
    text: 'Strength describes how well sediment resists being pulled apart. Uniform sediment has the same material throughout; layered sediment has layers with different strengths.',
  },
  slip: {
    source: 'slip',
    text: 'How far the two blocks of rock move past each other along the fault. The simulations increase this movement step by step.',
  },
  offset: {
    source: 'vertical-separation',
    text: 'The vertical difference across a rupture at the ground surface: how much higher one side ends up than the other. This differs from movement along the fault underground.',
  },
  stages: {
    source: 'model-stage',
    text: 'A stage is one saved point within a simulation as fault slip increases. Each stage has its own measurements; one simulation can contribute several stages.',
  },
  scarpTypes: {
    source: 'scarp-classes',
    text: 'The shapes produced by the simulations: an inclined slope, a pressure ridge, or a direct offset. Each can also occur with collapse, giving six scarp types.',
  },
  scarp_height: {
    source: 'scarp-height',
    text: 'The total height of the scarp above the undeformed ground on the lower side of the fault. A pressure ridge can stand above the undeformed ground on the lifted side as well — that extra height is called additional uplift (Us − Ud).',
  },
  dzw: {
    source: 'dzw',
    text: 'The width from the first sign of vertical ground movement on the raised side to the base of the scarp on the lower side. It spans the disturbed ground; it is not a distance outward from the fault line.',
  },
  scarp_dip: {
    source: 'scarp-dip',
    text: 'The angle of the scarp face from horizontal, from its top to its base. This is different from the angle of the fault underground.',
  },
  median: {
    source: 'iqr',
    text: 'The middle of the sorted measurements, also called the 50th percentile. It describes the matching measurements, not a recommended design value.',
  },
  percentile: {
    source: 'iqr',
    text: 'A percentile marks a position in the sorted measurements. The 16th and 84th percentiles bound the middle 68% of the distribution. They are not probabilities of an earthquake.',
  },
} as const satisfies Readonly<Record<string, { readonly source: string; readonly text: string }>>;

export type DefinitionKey = keyof typeof DEFINITIONS;
