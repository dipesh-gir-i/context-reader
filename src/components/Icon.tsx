import React from 'react';

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const paths: Record<string, React.ReactNode> = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8"/><path d="M8 11h7"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.5 4.5"/></>,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></>,
    settings: <><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19 15 .8 1.7-1.9 1.9-1.7-.8-1.4.6-.6 1.8h-2.7l-.6-1.8-1.4-.6-1.7.8-1.9-1.9.8-1.7-.6-1.4-1.8-.6V10.3l1.8-.6.6-1.4-.8-1.7 1.9-1.9 1.7.8 1.4-.6.6-1.8h2.7l.6 1.8 1.4.6 1.7-.8 1.9 1.9-.8 1.7.6 1.4 1.8.6V13l-1.8.6Z"/></>,
    bookmark: <><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3-6 3z"/></>,
    history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9h4.5"/><path d="M12 7v5l3.5 2"/></>,
    chevronLeft: <path d="m14.5 5-7 7 7 7"/>,
    chevronRight: <path d="m9.5 5 7 7-7 7"/>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    x: <><path d="m7 7 10 10"/><path d="m17 7-10 10"/></>,
    external: <><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
    check: <path d="m5 12 4 4L19 6"/>
  };
  return <svg {...common}>{paths[name] ?? paths.book}</svg>;
}
