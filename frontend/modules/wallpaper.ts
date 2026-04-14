/**
 * Wallpaper Module - TypeScript interface for native Android WallpaperModule
 * Only works on Android native builds. Expo Go / Web are gracefully handled.
 */
import { NativeModules, Platform } from 'react-native';

const WallpaperModule = Platform.OS === 'android' ? NativeModules.WallpaperModule : null;

export async function setWallpaperUri(uri: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WallpaperModule) {
    console.warn('[Wallpaper] WallpaperModule is not available in this build.');
    return;
  }
  return WallpaperModule.setWallpaperUri(uri);
}

export async function launchWallpaperPicker(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Live wallpapers are only supported on Android.');
  }
  if (!WallpaperModule) {
    throw new Error('WallpaperModule is not available. Use APK build.');
  }
  return WallpaperModule.launchWallpaperPicker();
}

export async function openWallpaperChooser(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WallpaperModule) return;
  return WallpaperModule.openWallpaperChooser();
}

export const isWallpaperModuleAvailable = (): boolean => {
  return Platform.OS === 'android' && !!WallpaperModule;
};
