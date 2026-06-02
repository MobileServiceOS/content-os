// Shared bits for source stubs.
export const EMPTY_RANGE = { start: 0, end: 0 };

/** Standard error a not-yet-wired Phase 2 source throws. */
export class SourceNotConfiguredError extends Error {
  constructor(label: string) {
    super(`${label} is not connected yet (Phase 2). Stay on sample data until it's wired.`);
    this.name = 'SourceNotConfiguredError';
  }
}
