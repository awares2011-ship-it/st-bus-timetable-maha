import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration.
 *
 * The app ships as a static PWA. To produce an Android APK/AAB later:
 *
 *   npm run build
 *   npx cap add android
 *   npx cap sync android
 *   npx cap open android   # then Build > Generate Signed Bundle/APK in Android Studio
 *
 * The Android app uses the SAME static JSON data architecture that is bundled
 * in `dist/` (via `webDir`). No Android backend is required.
 */
const config: CapacitorConfig = {
  appId: 'in.msrtc.sttimetable',
  appName: 'ST Bus Timetable Maha',
  webDir: 'dist',
  backgroundColor: '#ffffff',
  android: {
    // Keep the app usable offline; the service worker + bundled JSON handle data.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
