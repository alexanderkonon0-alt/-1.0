import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RADIO_STATIONS, RadioStation } from '../constants/radioStations';
import { Language } from '../constants/translations';

export type EffectType = 'none' | 'rain' | 'snow' | 'leaves' | 'sparkles' | 'bubbles' | 'fireflies' | 'petals';

export interface WallpaperItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  name: string;
  isBuiltIn?: boolean;
  thumbnailUri?: string;
}

const DAILY_WALLPAPERS = [
  { uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=80', name: 'Forest Light' },
  { uri: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1080&q=80', name: 'Mountain Lake' },
  { uri: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1080&q=80', name: 'Flower Field' },
  { uri: 'https://images.unsplash.com/photo-1444927714506-8492d94b4e3d?w=1080&q=80', name: 'Cosmic Space' },
  { uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=80', name: 'Misty Forest' },
  { uri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1080&q=80', name: 'Night Sky' },
  { uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80', name: 'Autumn Colors' },
  { uri: 'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=1080&q=80', name: 'Starry Lake' },
  { uri: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1080&q=80', name: 'Green Hills' },
  { uri: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1080&q=80', name: 'Ocean Sunset' },
];

const BUILT_IN_WALLPAPERS: WallpaperItem[] = [
  { id: 'builtin_1', uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=80', type: 'photo', name: 'Forest Light', isBuiltIn: true },
  { id: 'builtin_2', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80', type: 'photo', name: 'Autumn Leaves', isBuiltIn: true },
  { id: 'builtin_3', uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=80', type: 'photo', name: 'Misty Pines', isBuiltIn: true },
  { id: 'builtin_4', uri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1080&q=80', type: 'photo', name: 'Starry Night', isBuiltIn: true },
  { id: 'builtin_5', uri: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1080&q=80', type: 'photo', name: 'Mountain Lake', isBuiltIn: true },
  { id: 'builtin_6', uri: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1080&q=80', type: 'photo', name: 'Flower Field', isBuiltIn: true },
  { id: 'builtin_7', uri: 'https://images.unsplash.com/photo-1444927714506-8492d94b4e3d?w=1080&q=80', type: 'photo', name: 'Cosmic Space', isBuiltIn: true },
  { id: 'builtin_8', uri: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1080&q=80', type: 'photo', name: 'Green Hills', isBuiltIn: true },
];

function getDailyWallpaperIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % DAILY_WALLPAPERS.length;
}

// Audio helper - lazy import to avoid crashes on web
let audioModule: any = null;
async function getAudioModule() {
  if (audioModule) return audioModule;
  try {
    audioModule = await import('expo-audio');
    return audioModule;
  } catch {
    return null;
  }
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
  dailyWallpaper: { uri: string; name: string } | null;
  applyDailyWallpaper: () => void;
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
  setActiveEffect: (e: EffectType) => void;
  setEffectIntensity: (n: number) => void;
  autoChange: boolean;
  autoChangeInterval: number;
  setAutoChange: (v: boolean) => void;
  setAutoChangeInterval: (ms: number) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  isWidgetCollapsed: boolean;
  setIsWidgetCollapsed: (v: boolean) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>(BUILT_IN_WALLPAPERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [volumeState, setVolumeState] = useState(0.7);
  const [stationIndex, setStationIndex] = useState(0);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(RADIO_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeEffect, setActiveEffect] = useState<EffectType>('leaves');
  const [effectIntensity, setEffectIntensity] = useState(2);
  const [autoChange, setAutoChange] = useState(false);
  const [autoChangeInterval, setAutoChangeInterval] = useState(300);
  const [language, setLang] = useState<Language>('en');
  const [isWidgetCollapsed, setIsWidgetCollapsed] = useState(false);
  const dailyWallpaper = DAILY_WALLPAPERS[getDailyWallpaperIndex()];

  const audioPlayerRef = useRef<any>(null);
  const isPlayingRef = useRef(false);
  const autoChangeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stationIndexRef = useRef(0);

  // Load persisted data
  useEffect(() => {
    loadPersistedData();
  }, []);

  // Setup audio on mount
  useEffect(() => {
    initAudio();
  }, []);

  const initAudio = async () => {
    try {
      const audio = await getAudioModule();
      if (!audio) return;

      if (audio.setAudioModeAsync) {
        await audio.setAudioModeAsync({
          shouldPlayInBackground: true,
          playsInSilentMode: true,
        });
      }
    } catch (e) {
      console.log('Audio init error:', e);
    }
  };

  const loadPersistedData = async () => {
    try {
      const [savedWallpapers, savedLang, savedEffect, savedIntensity, savedVolume, savedStation, savedAutoChange, savedInterval] = await Promise.all([
        AsyncStorage.getItem('wallpapers'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('activeEffect'),
        AsyncStorage.getItem('effectIntensity'),
        AsyncStorage.getItem('volume'),
        AsyncStorage.getItem('stationIndex'),
        AsyncStorage.getItem('autoChange'),
        AsyncStorage.getItem('autoChangeInterval'),
      ]);

      if (savedWallpapers) {
        const parsed = JSON.parse(savedWallpapers);
        setWallpapers([...BUILT_IN_WALLPAPERS, ...parsed.filter((w: WallpaperItem) => !w.isBuiltIn)]);
      }
      if (savedLang) {
        setLang(savedLang as Language);
      } else {
        try {
          const Localization = await import('expo-localization');
          const deviceLang = Localization.locale?.split('-')[0] as Language;
          const supported = ['en', 'ru', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt', 'it', 'tr', 'ar'];
          if (supported.includes(deviceLang)) setLang(deviceLang);
        } catch {}
      }
      if (savedEffect) setActiveEffect(savedEffect as EffectType);
      if (savedIntensity) setEffectIntensity(parseInt(savedIntensity));
      if (savedVolume) setVolumeState(parseFloat(savedVolume));
      if (savedStation) {
        const idx = parseInt(savedStation);
        stationIndexRef.current = idx;
        setStationIndex(idx);
        setCurrentStation(RADIO_STATIONS[idx] || RADIO_STATIONS[0]);
      }
      if (savedAutoChange) setAutoChange(savedAutoChange === 'true');
      if (savedInterval) setAutoChangeInterval(parseInt(savedInterval));

      // Auto-play first station after delay
      setTimeout(() => {
        const station = RADIO_STATIONS[savedStation ? parseInt(savedStation) : 0] || RADIO_STATIONS[0];
        playStationInternal(station);
      }, 2000);
    } catch (e) {
      console.log('Load error:', e);
    }
  };

  const playStationInternal = async (station: RadioStation) => {
    try {
      // Stop existing player
      if (audioPlayerRef.current) {
        try {
          await audioPlayerRef.current.release?.();
        } catch {}
        audioPlayerRef.current = null;
      }

      const audio = await getAudioModule();
      if (!audio) return;

      // Use Audio.Sound for streaming
      if (audio.Audio?.Sound) {
        const { sound } = await audio.Audio.Sound.createAsync(
          { uri: station.url },
          { shouldPlay: true, volume: volumeState }
        );
        audioPlayerRef.current = sound;
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
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
    await playStationInternal(station);
  }, [volumeState]);

  const togglePlay = useCallback(async () => {
    try {
      if (!audioPlayerRef.current) {
        if (currentStation) {
          await playStationInternal(currentStation);
        }
        return;
      }
      const status = await audioPlayerRef.current.getStatusAsync?.();
      if (status?.isPlaying) {
        await audioPlayerRef.current.pauseAsync?.();
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else {
        await audioPlayerRef.current.playAsync?.();
        setIsPlaying(true);
        isPlayingRef.current = true;
      }
    } catch (e) {
      console.log('togglePlay error:', e);
    }
  }, [currentStation, volumeState]);

  const nextStation = useCallback(() => {
    const next = (stationIndexRef.current + 1) % RADIO_STATIONS.length;
    stationIndexRef.current = next;
    setStationIndex(next);
    AsyncStorage.setItem('stationIndex', String(next));
    const station = RADIO_STATIONS[next];
    setCurrentStation(station);
    playStationInternal(station);
  }, [volumeState]);

  const prevStation = useCallback(() => {
    const prev = (stationIndexRef.current - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    stationIndexRef.current = prev;
    setStationIndex(prev);
    AsyncStorage.setItem('stationIndex', String(prev));
    const station = RADIO_STATIONS[prev];
    setCurrentStation(station);
    playStationInternal(station);
  }, [volumeState]);

  const setVolume = useCallback(async (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    AsyncStorage.setItem('volume', String(clamped));
    if (audioPlayerRef.current) {
      try {
        await audioPlayerRef.current.setVolumeAsync?.(clamped);
      } catch {}
    }
  }, []);

  // AppState handler
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        // Pause on background
        if (audioPlayerRef.current && isPlayingRef.current) {
          try { await audioPlayerRef.current.pauseAsync?.(); } catch {}
        }
      } else if (state === 'active') {
        // Resume on foreground
        if (audioPlayerRef.current && isPlayingRef.current) {
          try { await audioPlayerRef.current.playAsync?.(); } catch {}
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

  const addWallpaper = useCallback(async (item: WallpaperItem) => {
    setWallpapers(prev => {
      const next = [item, ...prev];
      const userItems = next.filter(w => !w.isBuiltIn);
      AsyncStorage.setItem('wallpapers', JSON.stringify(userItems));
      return next;
    });
  }, []);

  const removeWallpaper = useCallback(async (id: string) => {
    setWallpapers(prev => {
      const next = prev.filter(w => w.id !== id);
      const userItems = next.filter(w => !w.isBuiltIn);
      AsyncStorage.setItem('wallpapers', JSON.stringify(userItems));
      return next;
    });
  }, []);

  const setCurrentWallpaper = useCallback((item: WallpaperItem) => {
    const idx = wallpapers.findIndex(w => w.id === item.id);
    if (idx !== -1) setCurrentIndex(idx);
  }, [wallpapers]);

  const nextWallpaper = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % wallpapers.length);
  }, [wallpapers.length]);

  const prevWallpaper = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + wallpapers.length) % wallpapers.length);
  }, [wallpapers.length]);

  const setLanguage = useCallback((l: Language) => {
    setLang(l);
    AsyncStorage.setItem('language', l);
  }, []);

  const handleSetActiveEffect = useCallback((e: EffectType) => {
    setActiveEffect(e);
    AsyncStorage.setItem('activeEffect', e);
  }, []);

  const handleSetEffectIntensity = useCallback((n: number) => {
    setEffectIntensity(n);
    AsyncStorage.setItem('effectIntensity', String(n));
  }, []);

  const handleSetAutoChange = useCallback((v: boolean) => {
    setAutoChange(v);
    AsyncStorage.setItem('autoChange', String(v));
  }, []);

  const handleSetAutoChangeInterval = useCallback((ms: number) => {
    setAutoChangeInterval(ms);
    AsyncStorage.setItem('autoChangeInterval', String(ms));
  }, []);

  const applyDailyWallpaper = useCallback(() => {
    const daily = DAILY_WALLPAPERS[getDailyWallpaperIndex()];
    const id = `daily_${new Date().toDateString().replace(/ /g, '_')}`;
    const existing = wallpapers.find(w => w.uri === daily.uri);
    if (existing) {
      setCurrentWallpaper(existing);
    } else {
      const newItem: WallpaperItem = { id, uri: daily.uri, type: 'photo', name: `Daily: ${daily.name}` };
      addWallpaper(newItem);
      setTimeout(() => setCurrentIndex(0), 100);
    }
  }, [wallpapers, addWallpaper, setCurrentWallpaper]);

  return (
    <AppContext.Provider value={{
      wallpapers,
      currentWallpaper: wallpapers[currentIndex] || null,
      currentIndex,
      addWallpaper,
      removeWallpaper,
      setCurrentWallpaper,
      nextWallpaper,
      prevWallpaper,
      dailyWallpaper,
      applyDailyWallpaper,
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
      setActiveEffect: handleSetActiveEffect,
      setEffectIntensity: handleSetEffectIntensity,
      autoChange,
      autoChangeInterval,
      setAutoChange: handleSetAutoChange,
      setAutoChangeInterval: handleSetAutoChangeInterval,
      language,
      setLanguage,
      isWidgetCollapsed,
      setIsWidgetCollapsed,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
