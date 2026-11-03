// The loaders' one rejection type (docs/app/ddd.md §5.10, Internal
// failure; §5.2). `kind` names the failed step: `'retrieval'` — a
// rejected fetch or a non-2xx status; `'read'` — decompression, an
// invalid manifest count or `trials` length, structural validation, or a
// missing or mistyped field (a `SchemaError` of `mapRecord` counts as
// `'read'`); `'schema-version'` — an unsupported `schema_version`;
// `'data-version'` — the loaded `export_version` differs from the
// expected one, carrying both as `expected` and `loaded`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

export type LoadErrorKind = 'retrieval' | 'read' | 'schema-version' | 'data-version';

export class LoadError extends Error {
  readonly kind: LoadErrorKind;
  /** The expected `export_version`; set exactly for kind `'data-version'`. */
  readonly expected?: string;
  /** The loaded `export_version`; set exactly for kind `'data-version'`. */
  readonly loaded?: string;
  /** The error that caused this one, if any. */
  readonly cause?: unknown;

  /**
   * A rejection of `kind`; `versions` is given exactly for
   * `'data-version'`, which `LoadError.dataVersion` builds.
   */
  constructor(
    kind: LoadErrorKind,
    message: string,
    cause?: unknown,
    versions?: { readonly expected: string; readonly loaded: string },
  ) {
    super(message);
    this.name = 'LoadError';
    this.kind = kind;
    if (cause !== undefined) this.cause = cause;
    if (versions !== undefined) {
      this.expected = versions.expected;
      this.loaded = versions.loaded;
    }
  }

  /** The `'data-version'` rejection, carrying `expected` and `loaded`. */
  static dataVersion(what: string, expected: string, loaded: string): LoadError {
    return new LoadError(
      'data-version',
      `${what}: this page expects data version ${expected}, but the loaded data is version ${loaded}`,
      undefined,
      { expected, loaded },
    );
  }
}
