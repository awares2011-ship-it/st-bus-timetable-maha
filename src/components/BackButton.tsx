/**
 * BackButton - Marathi back button to go to previous screen
 */
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
}

export function BackButton({ className = '', fallbackPath = '/' }: BackButtonProps) {
  const navigate = useNavigate();
  const { lang } = useI18n();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {lang === 'mr' ? 'मागे जा' : lang === 'hi' ? 'वापस जाएं' : 'Go Back'}
    </button>
  );
}

/**
 * Compact Back Button (icon only)
 */
export function BackButtonCompact({ className = '', fallbackPath = '/' }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
