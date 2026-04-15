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

// ── Particle effect settings ──
export async function setEffect(
  type: string,
  intensity: number,
  speed: number,
): Promise<void> {
  if (!WM) return;
  return WM.setEffect(type, intensity, speed);
}

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

export async function startAudioService(): Promise<void> {
  if (!WM) return;
  return WM.startAudioService();
}

export async function stopAudioService(): Promise<void> {
  if (!WM) return;
  return WM.stopAudioService();
}
