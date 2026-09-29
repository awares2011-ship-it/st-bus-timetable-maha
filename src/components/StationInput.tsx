import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Stop } from '@/types/domain';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { buildStopIndex, searchStops } from '@/search/searchEngine';
import { PinIcon } from './Icons';

interface Props {
  label: string;
  placeholder: string;
  value: string | null;
  onChange: (stopId: string | null) => void;
  autoFocus?: boolean;
}

export function StationInput({ label, placeholder, value, onChange, autoFocus }: Props) {
  const { core, stopById } = useData();
  const { lang } = useI18n();
  const index = useMemo(() => buildStopIndex(core?.stops ?? []), [core?.stops]);

  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Reflect an externally-set value (e.g. from a popular route) as its name.
  useEffect(() => {
    if (value) {
      const s = stopById.get(value);
      if (s) setText(localName(lang, s));
    } else {
      setText('');
    }
  }, [value, stopById, lang]);

  const suggestions = useMemo<Stop[]>(() => {
    if (!text.trim() || !open) return [];
    return searchStops(index, text, 8);
  }, [text, open, index]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (s: Stop) => {
    onChange(s.id);
    setText(localName(lang, s));
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && suggestions[active]) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <div className="relative">
        <PinIcon
          width={18}
          height={18}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-st-500"
        />
        <input
          className="field pl-10"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
            if (value) onChange(null);
          }}
          onFocus={() => text && setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              className={`flex cursor-pointer items-center justify-between px-4 py-2.5 ${
                i === active ? 'bg-st-50' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-800">
                  {localName(lang, s)}
                </span>
                <span className="block truncate text-xs text-slate-400">
                  {lang === 'en' ? s.nameMr : s.name} · {s.district}
                </span>
              </span>
              {s.type === 'station' && (
                <span className="chip bg-slate-100 text-[10px] text-slate-500">ST</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
