import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: () => void;
  description?: string;
}

const defaultShortcuts: KeyboardShortcut[] = [
  {
    key: 'h',
    callback: () => {
      const event = new CustomEvent('toggle-hud');
      window.dispatchEvent(event);
    },
    description: 'Toggle HUD visibility',
  },
  {
    key: 's',
    ctrl: true,
    shift: true,
    callback: () => {
      const event = new CustomEvent('toggle-stream-mode');
      window.dispatchEvent(event);
    },
    description: 'Toggle stream mode',
  },
  {
    key: 'm',
    callback: () => {
      const event = new CustomEvent('toggle-minimap');
      window.dispatchEvent(event);
    },
    description: 'Toggle minimap',
  },
  {
    key: 'Escape',
    callback: () => {
      const event = new CustomEvent('close-dialogs');
      window.dispatchEvent(event);
    },
    description: 'Close all dialogs',
  },
];

export function useKeyboardShortcuts(customShortcuts: KeyboardShortcut[] = []) {
  const shortcuts = [...defaultShortcuts, ...customShortcuts];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = (event.ctrlKey || event.metaKey) === (shortcut.ctrl ?? false);
        const shiftMatch = event.shiftKey === (shortcut.shift ?? false);
        const altMatch = event.altKey === (shortcut.alt ?? false);

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.callback();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  return shortcuts;
}

// Get readable shortcut string
export function getShortcutString(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join('+');
}

// Shortcut help dialog
export function getShortcutHelp(): string {
  const shortcuts = defaultShortcuts;
  return shortcuts
    .map((s) => `${getShortcutString(s).padEnd(15)} — ${s.description || 'No description'}`)
    .join('\n');
}
