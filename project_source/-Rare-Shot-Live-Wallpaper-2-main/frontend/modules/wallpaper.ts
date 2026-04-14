/**
 * Wallpaper Module - TypeScript interface for native Android WallpaperModule
 * Only works on Android. iOS calls are gracefully ignored.
 */
import { NativeModules, Platform } from 'react-native';

const { WallpaperModule } = NativeModules;

/**
 * Save the photo URL to SharedPreferences so the live wallpaper service
 * will display it on the home screen.
 */
export async function setWallpaperUri(uri: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WallpaperModule) {
    console.warn('[Wallpaper] WallpaperModule is not available in this build.');
    return;
  }
  return WallpaperModule.setWallpaperUri(uri);
}

/**
 * Open the Android live wallpaper preview for "Rare Shot Live Wallpaper".
 * The user sees a preview screen and can set it as their live wallpaper.
 */
export async function launchWallpaperPicker(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Live wallpapers are only supported on Android.');
  }
  if (!WallpaperModule) {
    throw new Error('WallpaperModule is not available. Rebuild the app.');
  }
  return WallpaperModule.launchWallpaperPicker();
}

/**
 * Open the full Android live wallpaper chooser (shows all live wallpapers).
 */
export async function openWallpaperChooser(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!WallpaperModule) return;
  return WallpaperModule.openWallpaperChooser();
}

export const isWallpaperModuleAvailable = (): boolean => {
  return Platform.OS === 'android' && !!WallpaperModule;
};
