// Custom type declarations

// Extend Range with the expand method from DOM Selection API
interface Range {
  /**
   * Expands the Range to include the indicated unit
   * @param unit The unit to expand by, e.g. 'word', 'character', 'sentence', etc.
   */
  expand(unit: string): void;
} 