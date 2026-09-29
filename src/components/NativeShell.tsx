import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { isNativeApp, rescheduleLockScreen, listenForNotificationTaps } from '@/services/lockScreenNotifications';

/**
 * Phone-app glue (renders nothing):
 *  - plans lock-screen notifications on start and whenever the profile, pass
 *    or favourites change;
 *  - tapping a notification opens the matching page;
 *  - Android app: hardware back goes back a page (exits only from home), and
 *    the status bar matches the header colour.
 */
export function NativeShell() {
  const navigate = useNavigate();
  const { lang } = useI18n();

  useEffect(() => {
    void rescheduleLockScreen(lang);
    const on = () => void rescheduleLockScreen(lang);
    window.addEventListener('smart-alerts-changed', on);
    window.addEventListener('favorites-changed', on);
    return () => {
      window.removeEventListener('smart-alerts-changed', on);
      window.removeEventListener('favorites-changed', on);
    };
  }, [lang]);

  useEffect(() => {
    void listenForNotificationTaps((to) => navigate(to));
    if (!isNativeApp()) return;
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import('@capacitor/app');
      const h = await App.addListener('backButton', ({ canGoBack }) => {
        if (window.location.pathname !== '/' && canGoBack) window.history.back();
        else void App.minimizeApp();
      });
      remove = () => void h.remove();
      // Re-plan when the app comes back to the foreground (content stays fresh).
      await App.addListener('appStateChange', ({ isActive }) => { if (isActive) void rescheduleLockScreen(lang); });
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setBackgroundColor({ color: '#e11d48' });
        await StatusBar.setStyle({ style: Style.Dark }); // light icons on the red bar
      } catch { /* older Android */ }
    })();
    return () => remove?.();
  }, [navigate, lang]);

  return null;
}
