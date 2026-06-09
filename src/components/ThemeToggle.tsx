'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Subscribe to <html> class changes so the icon stays in sync with the theme. */
function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const isDarkSnapshot = () => document.documentElement.classList.contains('dark');
const serverSnapshot = () => false;

/** Sun/moon toggle for switching between light and dark mode. Persists to localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  // useSyncExternalStore reads the DOM (external store) without setState-in-effect,
  // and returns the SSR-safe snapshot during hydration to avoid a mismatch.
  const isDark = useSyncExternalStore(subscribe, isDarkSnapshot, serverSnapshot);

  const toggle = () => {
    const next = !isDark;
    // Mutating the class triggers the MutationObserver, which updates `isDark`.
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-gray-200 transition-colors hover:bg-gray-700 hover:text-white',
        className,
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
