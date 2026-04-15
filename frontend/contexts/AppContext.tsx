import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { RADIO_STATIONS, RadioStation } from '../constants/radioStations';
import { Language } from '../constants/translations';
import {
  isWallpaperModuleAvailable,
  setEffect as nativeSetEffect,
  setAutoChange as nativeSetAutoChange,
  setWallpaperUris as nativeSetWallpaperUris,
  setWallpaperUri as nativeSetWallpaperUri,
  setVideoUri as nativeSetVideoUri,
  setRadioUrl as nativeSetRadioUrl,
} from '../modules/wallpaper';

export type EffectType = 'none' | 'rain' | 'snow' | 'leaves' | 'sparkles' | 'bubbles' | 'fireflies' | 'petals';

export interface WallpaperItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  name: string;
  thumbnailUri?: string;
  isBuiltIn?: boolean;
}

interface AppContextType {
  wallpapers: WallpaperItem[];
  currentWallpaper: WallpaperItem | null;
  currentIndex: number;
  addWallpaper: (item: WallpaperItem) => void;
  removeWallpaper: (id: string) => void;
  setCurrentWallpaper: (item: WallpaperItem) => void;
  nextWallpaper: () => void;
  prevWallpaper: () => void;
  volume: number;
  setVolume: (v: number) => void;
  isPlaying: boolean;
  currentStation: RadioStation | null;
  stationIndex: number;
  playStation: (station: RadioStation) => Promise<void>;
  nextStation: () => void;
  prevStation: () => void;
  togglePlay: () => void;
  activeEffect: EffectType;
  effectIntensity: number;
  effectSpeed: number;
  setActiveEffect: (e: EffectType) => void;
  setEffectIntensity: (n: number) => void;
  setEffectSpeed: (n: number) => void;
  autoChange: boolean;
  autoChangeInterval: number;
  setAutoChange: (v: boolean) => void;
  setAutoChangeInterval: (ms: number) => void;
  language: Language;
  setLanguage: (l: Language) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volumeState, setVolumeState] = useState(0.7);
  const [stationIndex, setStationIndex] = useState(0);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(RADIO_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeEffect, setActiveEffect] = useState<EffectType>('leaves');
  const [effectIntensity, setEffectIntensity] = useState(2);
  const [effectSpeed, setEffectSpeedState] = useState(2);
  const [autoChange, setAutoChange] = useState(false);
  const [autoChangeInterval, setAutoChangeInterval] = useState(300);
  const [language, setLang] = useState<Language>('ru');

  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);
  const autoChangeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stationIndexRef = useRef(0);
  const volumeRef = useRef(0.7);

  useEffect(() => {
    loadPersistedData();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const initAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.log('Audio init error:', e);
    }
  };

  const loadPersistedData = async () => {
    try {
      await initAudio();

      const [savedWallpapers, savedLang, savedEffect, savedIntensity, savedSpeed, savedVolume, savedStation, savedAutoChange, savedInterval] = await Promise.all([
        AsyncStorage.getItem('wallpapers'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('activeEffect'),
        AsyncStorage.getItem('effectIntensity'),
        AsyncStorage.getItem('effectSpeed'),
        AsyncStorage.getItem('volume'),
        AsyncStorage.getItem('stationIndex'),
        AsyncStorage.getItem('autoChange'),
        AsyncStorage.getItem('autoChangeInterval'),
      ]);

      if (savedWallpapers) {
        const parsed = JSON.parse(savedWallpapers);
        if (Array.isArray(parsed)) setWallpapers(parsed);
      }
      if (savedLang) setLang(savedLang as Language);
      else {
        try {
          const Localization = await import('expo-localization');
          const deviceLang = Localization.locale?.split('-')[0] as Language;
          const supported = ['en', 'ru', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt', 'it', 'tr', 'ar'];
          if (supported.includes(deviceLang)) setLang(deviceLang);
        } catch {}
      }
      if (savedEffect) setActiveEffect(savedEffect as EffectType);
      if (savedIntensity) setEffectIntensity(parseInt(savedIntensity));
      if (savedSpeed) setEffectSpeedState(parseInt(savedSpeed));
      if (savedVolume) { setVolumeState(parseFloat(savedVolume)); volumeRef.current = parseFloat(savedVolume); }
      if (savedStation) {
        const idx = parseInt(savedStation);
        stationIndexRef.current = idx;
        setStationIndex(idx);
        setCurrentStation(RADIO_STATIONS[idx] || RADIO_STATIONS[0]);
      }
      if (savedAutoChange) setAutoChange(savedAutoChange === 'true');
      if (savedInterval) setAutoChangeInterval(parseInt(savedInterval));

      // Auto-play first station
      setTimeout(() => {
        const station = RADIO_STATIONS[savedStation ? parseInt(savedStation) : 0] || RADIO_STATIONS[0];
        playStationInternal(station);
      }, 1500);
    } catch (e) {
      console.log('Load error:', e);
    }
  };

  const playStationInternal = async (station: RadioStation) => {
    try {
      // Stop existing sound
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }

      console.log('Playing station:', station.name, station.url);
      const { sound } = await Audio.Sound.createAsync(
        { uri: station.url },
        { shouldPlay: true, volume: volumeRef.current, isLooping: false }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      isPlayingRef.current = true;
      console.log('Station playing successfully:', station.name);

      // Listen for playback status to detect errors
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying && !status.isBuffering && status.didJustFinish) {
          // Stream ended, try to replay
          sound.playAsync().catch(() => {});
        }
      });
    } catch (e) {
      console.log('Play station error:', e);
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  const playStation = useCallback(async (station: RadioStation) => {
    setCurrentStation(station);
    const idx = RADIO_STATIONS.findIndex(s => s.id === station.id);
    if (idx !== -1) {
      stationIndexRef.current = idx;
      setStationIndex(idx);
      AsyncStorage.setItem('stationIndex', String(idx));
    }
    // Sync radio URL to native WallpaperService
    if (isWallpaperModuleAvailable()) {
      nativeSetRadioUrl(station.url).catch(() => {});
    }
    await playStationInternal(station);
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      if (!soundRef.current) {
        if (currentStation) await playStationInternal(currentStation);
        return;
      }
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    } catch (e) {
      console.log('togglePlay error:', e);
      // Recreate if broken
      if (currentStation) await playStationInternal(currentStation);
    }
  }, [currentStation]);

  const nextStation = useCallback(() => {
    const next = (stationIndexRef.current + 1) % RADIO_STATIONS.length;
    stationIndexRef.current = next;
    setStationIndex(next);
    AsyncStorage.setItem('stationIndex', String(next));
    const station = RADIO_STATIONS[next];
    setCurrentStation(station);
    playStationInternal(station);
  }, []);

  const prevStation = useCallback(() => {
    const prev = (stationIndexRef.current - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    stationIndexRef.current = prev;
    setStationIndex(prev);
    AsyncStorage.setItem('stationIndex', String(prev));
    const station = RADIO_STATIONS[prev];
    setCurrentStation(station);
    playStationInternal(station);
  }, []);

  const setVolume = useCallback(async (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    AsyncStorage.setItem('volume', String(clamped));
    if (soundRef.current) {
      try { await soundRef.current.setVolumeAsync(clamped); } catch {}
    }
  }, []);

  // AppState handler - pause/resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        if (soundRef.current && isPlayingRef.current) {
          try { await soundRef.current.pauseAsync(); } catch {}
        }
      } else if (state === 'active') {
        if (soundRef.current && isPlayingRef.current) {
          try { await soundRef.current.playAsync(); } catch {}
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Auto-change wallpaper timer
  useEffect(() => {
    if (autoChangeTimerRef.current) clearInterval(autoChangeTimerRef.current);
    if (autoChange && wallpapers.length > 1) {
      autoChangeTimerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % wallpapers.length);
      }, autoChangeInterval * 1000);
    }
    return () => {
      if (autoChangeTimerRef.current) clearInterval(autoChangeTimerRef.current);
    };
  }, [autoChange, autoChangeInterval, wallpapers.length]);

  const persistWallpapers = (items: WallpaperItem[]) => {
    AsyncStorage.setItem('wallpapers', JSON.stringify(items));
  };

  const addWallpaper = useCallback((item: WallpaperItem) => {
    setWallpapers(prev => {
      const next = [item, ...prev];
      persistWallpapers(next);
      return next;
    });
  }, []);

  const removeWallpaper = useCallback((id: string) => {
    setWallpapers(prev => {
      const next = prev.filter(w => w.id !== id);
      persistWallpapers(next);
      return next;
    });
  }, []);

  const setCurrentWallpaper = useCallback((item: WallpaperItem) => {
    const idx = wallpapers.findIndex(w => w.id === item.id);
    if (idx !== -1) setCurrentIndex(idx);
  }, [wallpapers]);

  const nextWallpaper = useCallback(() => {
    if (wallpapers.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % wallpapers.length);
  }, [wallpapers.length]);

  const prevWallpaper = useCallback(() => {
    if (wallpapers.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + wallpapers.length) % wallpapers.length);
  }, [wallpapers.length]);

  const setLanguage = useCallback((l: Language) => { setLang(l); AsyncStorage.setItem('language', l); }, []);
  const handleSetActiveEffect = useCallback((e: EffectType) => { setActiveEffect(e); AsyncStorage.setItem('activeEffect', e); }, []);
  const handleSetEffectIntensity = useCallback((n: number) => { setEffectIntensity(n); AsyncStorage.setItem('effectIntensity', String(n)); }, []);
  const handleSetEffectSpeed = useCallback((n: number) => { setEffectSpeedState(n); AsyncStorage.setItem('effectSpeed', String(n)); }, []);
  const handleSetAutoChange = useCallback((v: boolean) => { setAutoChange(v); AsyncStorage.setItem('autoChange', String(v)); }, []);
  const handleSetAutoChangeInterval = useCallback((ms: number) => { setAutoChangeInterval(ms); AsyncStorage.setItem('autoChangeInterval', String(ms)); }, []);

  // ── Sync settings to native WallpaperService (Android) ──
  useEffect(() => {
    if (!isWallpaperModuleAvailable()) return;
    nativeSetEffect(activeEffect, effectIntensity, effectSpeed).catch(() => {});
  }, [activeEffect, effectIntensity, effectSpeed]);

  useEffect(() => {
    if (!isWallpaperModuleAvailable()) return;
    nativeSetAutoChange(autoChange, autoChangeInterval).catch(() => {});
  }, [autoChange, autoChangeInterval]);

  useEffect(() => {
    if (!isWallpaperModuleAvailable()) return;
    const uris = wallpapers.filter(w => w.type === 'photo').map(w => w.uri);
    nativeSetWallpaperUris(uris).catch(() => {});
  }, [wallpapers]);

  useEffect(() => {
    if (!isWallpaperModuleAvailable()) return;
    const cw = wallpapers.length > 0 ? (wallpapers[currentIndex] || wallpapers[0]) : null;
    if (!cw) return;
    if (cw.type === 'video') {
      nativeSetVideoUri(cw.uri).catch(() => {});
    } else {
      nativeSetWallpaperUri(cw.uri).catch(() => {});
    }
  }, [currentIndex, wallpapers]);

  return (
    <AppContext.Provider value={{
      wallpapers,
      currentWallpaper: wallpapers.length > 0 ? (wallpapers[currentIndex] || wallpapers[0]) : null,
      currentIndex,
      addWallpaper,
      removeWallpaper,
      setCurrentWallpaper,
      nextWallpaper,
      prevWallpaper,
      volume: volumeState,
      setVolume,
      isPlaying,
      currentStation,
      stationIndex,
      playStation,
      nextStation,
      prevStation,
      togglePlay,
      activeEffect,
      effectIntensity,
      effectSpeed,
      setActiveEffect: handleSetActiveEffect,
      setEffectIntensity: handleSetEffectIntensity,
      setEffectSpeed: handleSetEffectSpeed,
      autoChange,
      autoChangeInterval,
      setAutoChange: handleSetAutoChange,
      setAutoChangeInterval: handleSetAutoChangeInterval,
      language,
      setLanguage,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
