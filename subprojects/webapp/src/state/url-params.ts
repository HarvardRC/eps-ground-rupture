// The reserved shared-link parameter names (docs/app/ddd.md §5.6, URL
// encoding (P2)). Links circulate in readers' documents, so the names
// are a de facto public interface (ADR-0010) and are reserved now, each
// snake_case per DD-10, beside the table's "Carries" text. Only the names
// bind: the value grammar is deferred to P2, and no MVP module reads or
// writes URL state.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

/** The reserved parameters, in the order of the §5.6 table. */
export const RESERVED_URL_PARAMETERS = [
  { name: 'dips', carries: 'fault_dip' },
  { name: 'strength', carries: 'sediment' },
  { name: 'depth', carries: 'depth' },
  { name: 'density', carries: 'density' },
  { name: 'mode', carries: 'entry_mode' },
  { name: 'win', carries: 'slip_window, slip mode only' },
  { name: 'offset', carries: 'offset_max, offset mode only' },
  { name: 'pop', carries: 'population' },
  { name: 'classes', carries: 'scarp_class' },
  { name: 'family', carries: 'familyView' },
  { name: 'overlay', carries: 'overlay' },
  { name: 'meas', carries: 'measurement' },
  { name: 'view', carries: "each panel's view" },
  { name: 'showall', carries: "each overlay panel's showAll" },
  { name: 'inv', carries: 'the inverse-mode switch of §5.14 (P2)' },
] as const;

/** A reserved parameter name. */
export type ReservedUrlParameter = (typeof RESERVED_URL_PARAMETERS)[number]['name'];
