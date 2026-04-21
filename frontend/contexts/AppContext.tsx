import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { RADIO_STATIONS, RadioStation } from '../constants/radioStations';
import { Language } from '../constants/translations';
import {
  nativeSetEffect, nativeSetWallpaper, nativeNextWallpaper, nativePrevWallpaper,
  nativeSetVolume, nativeStartAudioService, nativeStopAudioService,
  isWallpaperModuleAvailable,
} from '../modules/wallpaper';

export type EffectType = 'none' | 'rain' | 'snow' | 'leaves' | 'sparkles' | 'bubbles' | 'fireflies' | 'petals';
export type IntensityLevel = 1 | 2 | 3;
export type SpeedLevel = 1 | 2 | 3;

export interface WallpaperItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  name: string;
}

interface AppContextValue {
  // Wallpapers
  wallpapers: WallpaperItem[];
  addWallpaper: (item: WallpaperItem) => Promise<void>;
  removeWallpaper: (id: string) => Promise<void>;
  setCurrentWallpaper: (item: WallpaperItem) => void;
  currentWallpaper: WallpaperItem | null;
  autoChange: boolean;
  setAutoChange: (v: boolean) => void;
  autoChangeInterval: number;
  setAutoChangeInterval: (v: number) => void;
  nextWallpaper: () => void;
  prevWallpaper: () => void;
  // Effects
  activeEffect: EffectType;
  setActiveEffect: (e: EffectType) => void;
  effectIntensity: IntensityLevel;
  setEffectIntensity: (v: IntensityLevel) => void;
  effectSpeed: SpeedLevel;
  setEffectSpeed: (v: SpeedLevel) => void;
  // Audio / Radio
  currentStation: RadioStation | null;
  setCurrentStation: (s: RadioStation) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  nextStation: () => void;
  prevStation: () => void;
  volume: number;
  setVolume: (v: number) => void;
  // Language
  language: Language;
  setLanguage: (l: Language) => void;
  // Widget UI state
  isWidgetCollapsed: boolean;
  setIsWidgetCollapsed: (v: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

const STORAGE_KEYS = {
  wallpapers: '@wallpapers_v2',
  currentWallpaper: '@currentWallpaper_v2',
  autoChange: '@autoChange_v2',
  autoChangeInterval: '@autoChangeInterval_v2',
  effect: '@activeEffect_v2',
  intensity: '@effectIntensity_v2',
  speed: '@effectSpeed_v2',
  stationIndex: '@stationIndex_v2',
  volume: '@volume_v2',
  language: '@language_v2',
};

async function save(key: string, value: unknown) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch {}
}
async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw != null) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

/** Detect Android device language from expo-localization */
function getDeviceLanguage(): Language {
  const supported: Language[] = ['en', 'ru', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt', 'it', 'tr', 'ar'];
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0]?.languageCode?.toLowerCase() as Language;
      if (code && supported.includes(code)) return code;
    }
  } catch {}
  return 'en';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Wallpaper state
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [currentWallpaper, setCurrentWallpaperState] = useState<WallpaperItem | null>(null);
  const [autoChange, setAutoChangeState] = useState(false);
  const [autoChangeInterval, setAutoChangeIntervalState] = useState(300);
  const wallpaperIndexRef = useRef(0);
  const autoChangeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Effects state
  const [activeEffect, setActiveEffectState] = useState<EffectType>('none');
  const [effectIntensity, setEffectIntensityState] = useState<IntensityLevel>(2);
  const [effectSpeed, setEffectSpeedState] = useState<SpeedLevel>(2);

  // Audio state
  const [currentStation, setCurrentStationState] = useState<RadioStation | null>(RADIO_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);
  const [language, setLanguageState] = useState<Language>('en');
  const [isWidgetCollapsed, setIsWidgetCollapsedState] = useState(false);

  // Audio refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);
  const wasPlayingBeforeBackground = useRef(false);
  const loadCounterRef = useRef(0);         // prevents race conditions
  const volumeRef = useRef(0.8);
  const currentStationRef = useRef<RadioStation | null>(RADIO_STATIONS[0]);
  const currentStationIndexRef = useRef(0);

  // ─── Setters ────────────────────────────────────────────────────────────────

  const setLanguage = useCallback((l: Language) => {
    setLanguageState(l);
    save(STORAGE_KEYS.language, l);
  }, []);

  const setIsWidgetCollapsed = useCallback((v: boolean) => {
    setIsWidgetCollapsedState(v);
  }, []);

  const setActiveEffect = useCallback((e: EffectType) => {
    setActiveEffectState(e);
    save(STORAGE_KEYS.effect, e);
    try { nativeSetEffect(e, effectIntensity, effectSpeed); } catch {}
  }, [effectIntensity, effectSpeed]);

  const setEffectIntensity = useCallback((v: IntensityLevel) => {
    setEffectIntensityState(v);
    save(STORAGE_KEYS.intensity, v);
    try { nativeSetEffect(activeEffect, v, effectSpeed); } catch {}
  }, [activeEffect, effectSpeed]);

  const setEffectSpeed = useCallback((v: SpeedLevel) => {
    setEffectSpeedState(v);
    save(STORAGE_KEYS.speed, v);
    try { nativeSetEffect(activeEffect, effectIntensity, v); } catch {}
  }, [activeEffect, effectIntensity]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    save(STORAGE_KEYS.volume, clamped);
    // Update currently playing sound
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(clamped).catch(() => {});
    }
    // Also update native audio service
    try { nativeSetVolume(clamped); } catch {}
  }, []);

  // ─── Audio engine ────────────────────────────────────────────────────────────

  const stopCurrentSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (sound) {
      try { await sound.stopAsync(); } catch {}
      try { await sound.unloadAsync(); } catch {}
    }
  }, []);

  const playStationInternal = useCallback(async (station: RadioStation) => {
    const myId = ++loadCounterRef.current;

    // Stop previous sound first
    const prevSound = soundRef.current;
    soundRef.current = null;
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (prevSound) {
      try { await prevSound.stopAsync(); } catch {}
      try { await prevSound.unloadAsync(); } catch {}
    }

    // Guard: if another call came in while we were stopping, abort
    if (myId !== loadCounterRef.current) return;
    if (!station?.url) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,   // pause on background per user requirement
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: station.url },
        {
          shouldPlay: true,
          volume: volumeRef.current,
          isLooping: false,
          progressUpdateIntervalMillis: 500,
        }
      );

      // Guard again after async create
      if (myId !== loadCounterRef.current) {
        try { await sound.unloadAsync(); } catch {}
        return;
      }

      soundRef.current = sound;
      setIsPlaying(true);
      isPlayingRef.current = true;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        if (status.isPlaying !== isPlayingRef.current && soundRef.current === sound) {
          // Sync ref with actual playback state
          isPlayingRef.current = status.isPlaying;
          setIsPlaying(status.isPlaying);
        }
      });

      // Also try to start native audio service for background notification
      try {
        nativeStartAudioService(station.url, station.name);
      } catch {}

    } catch (e) {
      if (myId === loadCounterRef.current) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (!currentStationRef.current) return;

    if (isPlayingRef.current && soundRef.current) {
      try { await soundRef.current.pauseAsync(); } catch {}
      setIsPlaying(false);
      isPlayingRef.current = false;
      try { nativeStopAudioService(); } catch {}
    } else if (!isPlayingRef.current && soundRef.current) {
      // Resume existing sound
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
          isPlayingRef.current = true;
        } else {
          // Sound died, restart
          await playStationInternal(currentStationRef.current);
        }
      } catch {
        await playStationInternal(currentStationRef.current);
      }
    } else {
      // No sound at all, start fresh
      await playStationInternal(currentStationRef.current);
    }
  }, [playStationInternal]);

  const setCurrentStation = useCallback(async (station: RadioStation) => {
    const idx = RADIO_STATIONS.findIndex(s => s.id === station.id);
    currentStationIndexRef.current = idx >= 0 ? idx : 0;
    currentStationRef.current = station;
    setCurrentStationState(station);
    save(STORAGE_KEYS.stationIndex, currentStationIndexRef.current);
    await playStationInternal(station);
  }, [playStationInternal]);

  const nextStation = useCallback(async () => {
    const nextIdx = (currentStationIndexRef.current + 1) % RADIO_STATIONS.length;
    currentStationIndexRef.current = nextIdx;
    const station = RADIO_STATIONS[nextIdx];
    currentStationRef.current = station;
    setCurrentStationState(station);
    save(STORAGE_KEYS.stationIndex, nextIdx);
    await playStationInternal(station);
  }, [playStationInternal]);

  const prevStation = useCallback(async () => {
    const prevIdx = (currentStationIndexRef.current - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    currentStationIndexRef.current = prevIdx;
    const station = RADIO_STATIONS[prevIdx];
    currentStationRef.current = station;
    setCurrentStationState(station);
    save(STORAGE_KEYS.stationIndex, prevIdx);
    await playStationInternal(station);
  }, [playStationInternal]);

  // ─── AppState handler (pause on background, resume on foreground) ───────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        wasPlayingBeforeBackground.current = isPlayingRef.current;
        if (soundRef.current && isPlayingRef.current) {
          try { await soundRef.current.pauseAsync(); } catch {}
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      } else if (state === 'active') {
        if (wasPlayingBeforeBackground.current) {
          wasPlayingBeforeBackground.current = false;
          const sound = soundRef.current;
          if (sound) {
            try {
              const status = await sound.getStatusAsync();
              if (status.isLoaded) {
                await sound.playAsync();
                setIsPlaying(true);
                isPlayingRef.current = true;
              } else {
                // Sound died while in background — restart
                const station = currentStationRef.current;
                if (station) await playStationInternal(station);
              }
            } catch {
              const station = currentStationRef.current;
              if (station) await playStationInternal(station);
            }
          } else {
            // No sound ref — restart
            const station = currentStationRef.current;
            if (station) await playStationInternal(station);
          }
        }
      }
    });
    return () => sub.remove();
  }, [playStationInternal]);

  // ─── Wallpaper helpers ───────────────────────────────────────────────────────

  const setCurrentWallpaper = useCallback((item: WallpaperItem) => {
    setCurrentWallpaperState(item);
    save(STORAGE_KEYS.currentWallpaper, item);
    const idx = wallpapers.findIndex(w => w.id === item.id);
    if (idx >= 0) wallpaperIndexRef.current = idx;
    try { nativeSetWallpaper(item.uri); } catch {}
  }, [wallpapers]);

  const addWallpaper = useCallback(async (item: WallpaperItem) => {
    setWallpapers(prev => {
      const next = [...prev, item];
      save(STORAGE_KEYS.wallpapers, next);
      return next;
    });
  }, []);

  const removeWallpaper = useCallback(async (id: string) => {
    setWallpapers(prev => {
      const next = prev.filter(w => w.id !== id);
      save(STORAGE_KEYS.wallpapers, next);
      return next;
    });
  }, []);

  const nextWallpaper = useCallback(() => {
    setWallpapers(prev => {
      if (prev.length === 0) return prev;
      wallpaperIndexRef.current = (wallpaperIndexRef.current + 1) % prev.length;
      const item = prev[wallpaperIndexRef.current];
      setCurrentWallpaperState(item);
      save(STORAGE_KEYS.currentWallpaper, item);
      try { nativeNextWallpaper(); } catch {}
      return prev;
    });
  }, []);

  const prevWallpaper = useCallback(() => {
    setWallpapers(prev => {
      if (prev.length === 0) return prev;
      wallpaperIndexRef.current = (wallpaperIndexRef.current - 1 + prev.length) % prev.length;
      const item = prev[wallpaperIndexRef.current];
      setCurrentWallpaperState(item);
      save(STORAGE_KEYS.currentWallpaper, item);
      try { nativePrevWallpaper(); } catch {}
      return prev;
    });
  }, []);

  const setAutoChange = useCallback((v: boolean) => {
    setAutoChangeState(v);
    save(STORAGE_KEYS.autoChange, v);
  }, []);

  const setAutoChangeInterval = useCallback((v: number) => {
    setAutoChangeIntervalState(v);
    save(STORAGE_KEYS.autoChangeInterval, v);
  }, []);

  // Auto-change wallpaper timer
  useEffect(() => {
    if (autoChangeTimerRef.current) {
      clearInterval(autoChangeTimerRef.current);
      autoChangeTimerRef.current = null;
    }
    if (autoChange && wallpapers.length > 1) {
      autoChangeTimerRef.current = setInterval(nextWallpaper, autoChangeInterval * 1000);
    }
    return () => {
      if (autoChangeTimerRef.current) clearInterval(autoChangeTimerRef.current);
    };
  }, [autoChange, autoChangeInterval, wallpapers.length, nextWallpaper]);

  // Sync native effect whenever effect settings change
  useEffect(() => {
    try { nativeSetEffect(activeEffect, effectIntensity, effectSpeed); } catch {}
  }, [activeEffect, effectIntensity, effectSpeed]);

  // ─── Load persisted data on mount ───────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const [
        savedWallpapers, savedCurrent, savedAutoChange, savedInterval,
        savedEffect, savedIntensity, savedSpeed,
        savedStationIndex, savedVolume, savedLanguage,
      ] = await Promise.all([
        load<WallpaperItem[]>(STORAGE_KEYS.wallpapers, []),
        load<WallpaperItem | null>(STORAGE_KEYS.currentWallpaper, null),
        load<boolean>(STORAGE_KEYS.autoChange, false),
        load<number>(STORAGE_KEYS.autoChangeInterval, 300),
        load<EffectType>(STORAGE_KEYS.effect, 'none'),
        load<IntensityLevel>(STORAGE_KEYS.intensity, 2),
        load<SpeedLevel>(STORAGE_KEYS.speed, 2),
        load<number>(STORAGE_KEYS.stationIndex, 0),
        load<number>(STORAGE_KEYS.volume, 0.8),
        load<Language | null>(STORAGE_KEYS.language, null),
      ]);

      setWallpapers(savedWallpapers);
      if (savedCurrent) {
        setCurrentWallpaperState(savedCurrent);
        const idx = savedWallpapers.findIndex(w => w.id === savedCurrent.id);
        if (idx >= 0) wallpaperIndexRef.current = idx;
      }
      setAutoChangeState(savedAutoChange);
      setAutoChangeIntervalState(savedInterval);
      setActiveEffectState(savedEffect);
      setEffectIntensityState(savedIntensity);
      setEffectSpeedState(savedSpeed);

      const clampedVol = Math.max(0, Math.min(1, savedVolume));
      setVolumeState(clampedVol);
      volumeRef.current = clampedVol;

      // Language: if no saved language, use device locale
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      } else {
        const deviceLang = getDeviceLanguage();
        setLanguageState(deviceLang);
        save(STORAGE_KEYS.language, deviceLang);
      }

      const stIdx = Math.max(0, Math.min(RADIO_STATIONS.length - 1, savedStationIndex));
      const initialStation = RADIO_STATIONS[stIdx];
      currentStationIndexRef.current = stIdx;
      currentStationRef.current = initialStation;
      setCurrentStationState(initialStation);

      // Auto-start first station after a short delay
      if (Platform.OS !== 'web') {
        setTimeout(() => {
          playStationInternal(initialStation);
        }, 1500);
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const value: AppContextValue = {
    wallpapers, addWallpaper, removeWallpaper, setCurrentWallpaper, currentWallpaper,
    autoChange, setAutoChange, autoChangeInterval, setAutoChangeInterval,
    nextWallpaper, prevWallpaper,
    activeEffect, setActiveEffect,
    effectIntensity, setEffectIntensity,
    effectSpeed, setEffectSpeed,
    currentStation, setCurrentStation,
    isPlaying, togglePlay, nextStation, prevStation,
    volume, setVolume,
    language, setLanguage,
    isWidgetCollapsed, setIsWidgetCollapsed,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
