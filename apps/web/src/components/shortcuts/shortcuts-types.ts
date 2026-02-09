/**
 * A single shortcut: key combo and description for display and search.
 */
export type ShortcutItem = {
  id: string;
  /** Display keys, e.g. ["⌘", "K"] or ["Ctrl", "Shift", "N"] */
  keys: string[];
  description: string;
  category?: string;
};
