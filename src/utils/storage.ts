import { Node, Edge } from '@xyflow/react';

const STORAGE_KEY = 'satisplanner_state';
const VERSION = 1;

export interface SavedState {
  version: number;
  nodes: Node[];
  edges: Edge[];
  nodeIdCounter: number;
  floorNames?: Record<string, string>;
  savedAt: string;
}

/**
 * Save state to localStorage
 */
export function saveToLocalStorage(
  nodes: Node[],
  edges: Edge[],
  nodeIdCounter: number,
  floorNames?: Record<string, string>
): void {
  try {
    const state: SavedState = {
      version: VERSION,
      nodes,
      edges,
      nodeIdCounter,
      floorNames,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

/**
 * Load state from localStorage
 */
export function loadFromLocalStorage(): SavedState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const state = JSON.parse(saved) as SavedState;

    // Version check for future migrations
    if (state.version !== VERSION) {
      console.warn('Saved state version mismatch, may need migration');
    }

    return state;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Clear localStorage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
}

/**
 * Export state to JSON file
 */
export function exportToFile(
  nodes: Node[],
  edges: Edge[],
  nodeIdCounter: number,
  floorNames?: Record<string, string>,
  filename?: string
): void {
  const state: SavedState = {
    version: VERSION,
    nodes,
    edges,
    nodeIdCounter,
    floorNames,
    savedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `satisplanner_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import state from JSON file
 * Returns a promise that resolves with the loaded state
 */
export function importFromFile(): Promise<SavedState> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const state = JSON.parse(content) as SavedState;

          // Validate the loaded state
          if (!state.nodes || !state.edges) {
            reject(new Error('Invalid file format'));
            return;
          }

          resolve(state);
        } catch (error) {
          reject(new Error('Failed to parse file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };

    input.click();
  });
}
