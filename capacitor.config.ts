import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quiet.journal',
  appName: 'Quiet',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#FAFAF7',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DEFAULT',
    },
    Keyboard: {
      resize: 'native',
    },
  },
};

export default config;
