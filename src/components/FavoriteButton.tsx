import { StarIcon, StarFilledIcon } from './Icons';

export function FavoriteButton({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
        active ? 'text-amber-500' : 'text-slate-300 hover:text-slate-400'
      }`}
    >
      {active ? <StarFilledIcon /> : <StarIcon />}
    </button>
  );
}
