/**
 * Wallpaper Module — TypeScript bridge to native Android WallpaperModule.
 * Only works in Android native (APK / AAB) builds.
 */
import { NativeModules, Platform } from 'react-native';

const WM = Platform.OS === 'android' ? NativeModules.WallpaperModule : null;

export const isWallpaperModuleAvailable = (): boolean =>
  Platform.OS === 'android' && !!WM;

// ── Image wallpaper ──
export async function setWallpaperUri(uri: string): Promise<void> {
  if (!WM) return;
  return WM.setWallpaperUri(uri);
}
export const nativeSetWallpaper = (uri: string): void => {
  if (!WM) return;
  WM.setWallpaperUri(uri).catch(() => {});
};

// ── Video wallpaper ──
export async function setVideoUri(uri: string): Promise<void> {
  if (!WM) return;
  return WM.setVideoUri(uri);
}

// ── List of URIs for auto-change cycling ──
export async function setWallpaperUris(uris: string[]): Promise<void> {
  if (!WM) return;
  return WM.setWallpaperUris(uris);
}

// ── Navigate wallpapers natively ──
export const nativeNextWallpaper = (): void => {
  if (!WM) return;
  WM.nextWallpaper?.().catch(() => {});
};
export const nativePrevWallpaper = (): void => {
  if (!WM) return;
  WM.prevWallpaper?.().catch(() => {});
};

// ── Particle effect settings ──
export async function setEffect(
  type: string,
  intensity: number,
  speed: number,
): Promise<void> {
  if (!WM) return;
  return WM.setEffect(type, intensity, speed);
}
export const nativeSetEffect = (type: string, intensity: number, speed: number): void => {
  if (!WM) return;
  WM.setEffect(type, intensity, speed).catch(() => {});
};

// ── Volume control ──
export const nativeSetVolume = (volume: number): void => {
  if (!WM) return;
  WM.setVolume?.(volume).catch(() => {});
};

// ── Auto-change settings ──
export async function setAutoChange(
  enabled: boolean,
  intervalSec: number,
): Promise<void> {
  if (!WM) return;
  return WM.setAutoChange(enabled, intervalSec);
}

// ── Launch system live wallpaper picker ──
export async function launchWallpaperPicker(): Promise<void> {
  if (!WM) throw new Error('WallpaperModule not available. Use APK/AAB build.');
  return WM.launchWallpaperPicker();
}

// ── Generic wallpaper chooser ──
export async function openWallpaperChooser(): Promise<void> {
  if (!WM) return;
  return WM.openWallpaperChooser();
}

// ── Device Admin for double-tap screen lock ──
export async function requestDeviceAdmin(): Promise<void> {
  if (!WM) return;
  return WM.requestDeviceAdmin();
}

export async function isDeviceAdminEnabled(): Promise<boolean> {
  if (!WM) return false;
  return WM.isDeviceAdminEnabled();
}

export async function lockScreen(): Promise<void> {
  if (!WM) return;
  return WM.lockScreen();
}

export async function setRadioUrl(url: string): Promise<void> {
  if (!WM) return;
  return WM.setRadioUrl(url);
}

export async function setStationName(name: string): Promise<void> {
  if (!WM) return;
  return WM.setStationName(name);
}

export async function setAsLockScreen(uri: string): Promise<void> {
  if (!WM) return;
  return WM.setAsLockScreen(uri);
}

export async function startAudioService(url?: string, stationName?: string): Promise<void> {
  if (!WM) return;
  if (url) {
    await WM.setRadioUrl(url).catch(() => {});
  }
  if (stationName) {
    await WM.setStationName(stationName).catch(() => {});
  }
  return WM.startAudioService();
}
export const nativeStartAudioService = (url: string, stationName: string): void => {
  if (!WM) return;
  startAudioService(url, stationName).catch(() => {});
};

export async function stopAudioService(): Promise<void> {
  if (!WM) return;
  return WM.stopAudioService();
}
export const nativeStopAudioService = (): void => {
  if (!WM) return;
  WM.stopAudioService().catch(() => {});
};
