import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
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

// Curated daily wallpapers (rotate by day of year)
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
  { uri: 'https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=1080&q=80', name: 'Winter Trees' },
  { uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&q=80', name: 'Mountain Peak' },
  { uri: 'https://images.unsplash.com/photo-1445611680063-4dc3d2d3ca4f?w=1080&q=80', name: 'Purple Bloom' },
  { uri: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?w=1080&q=80', name: 'Garden Peace' },
];

const BUILT_IN_WALLPAPERS: WallpaperItem[] = [
  { id: 'builtin_1', uri: 'https://images.unsplash.com/photo-1766317897765-28f0cc34a392?w=1080&q=80', type: 'photo', name: 'Evergreen Path', isBuiltIn: true },
  { id: 'builtin_2', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1080&q=80', type: 'photo', name: 'Autumn Leaves', isBuiltIn: true },
  { id: 'builtin_3', uri: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1080&q=80', type: 'photo', name: 'Misty Pines', isBuiltIn: true },
  { id: 'builtin_4', uri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1080&q=80', type: 'photo', name: 'Starry Night', isBuiltIn: true },
  { id: 'builtin_5', uri: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1080&q=80', type: 'photo', name: 'Forest Light', isBuiltIn: true },
  { id: 'builtin_6', uri: 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=1080&q=80', type: 'photo', name: 'Mountain Lake', isBuiltIn: true },
  { id: 'builtin_7', uri: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1080&q=80', type: 'photo', name: 'Flower Field', isBuiltIn: true },
  { id: 'builtin_8', uri: 'https://images.unsplash.com/photo-1444927714506-8492d94b4e3d?w=1080&q=80', type: 'photo', name: 'Cosmic Space', isBuiltIn: true },
];

// Get today's wallpaper index based on day of year
function getDailyWallpaperIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % DAILY_WALLPAPERS.length;
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
  playStation: (station: RadioStation) => void;
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
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [activeEffect, setActiveEffect] = useState<EffectType>('leaves');
  const [effectIntensity, setEffectIntensity] = useState(2);
  const [autoChange, setAutoChange] = useState(false);
  const [autoChangeInterval, setAutoChangeInterval] = useState(5 * 60 * 1000);
  const [language, setLang] = useState<Language>('en');
  const [isWidgetCollapsed, setIsWidgetCollapsed] = useState(false);
  const [currentStationUrl, setCurrentStationUrl] = useState<string>(RADIO_STATIONS[0].url);
  const dailyWallpaper = DAILY_WALLPAPERS[getDailyWallpaperIndex()];

  const isPlayingRef = useRef(false);
  const autoChangeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stationIndexRef = useRef(0);

  // expo-audio player
  const player = useAudioPlayer(currentStationUrl);
  const playerStatus = useAudioPlayerStatus(player);

  const isPlaying = playerStatus?.playing ?? false;

  // Setup audio mode on mount
  useEffect(() => {
    setAudioModeAsync({
      shouldPlayInBackground: true,
      playsInSilentMode: true,
    }).catch(() => {});
  }, []);

  // Sync volume to player
  useEffect(() => {
    if (player) {
      try { player.volume = volumeState; } catch {}
    }
  }, [volumeState, player]);

  // Auto-play on mount after small delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (player) {
        try { player.play(); } catch {}
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Load persisted data
  useEffect(() => {
    loadPersistedData();
  }, []);

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
      if (savedLang) setLang(savedLang as Language);
      else {
        const deviceLang = Localization.locale?.split('-')[0] as Language;
        const supported = ['en', 'ru', 'de', 'fr', 'es', 'zh', 'ja', 'ko', 'pt', 'it', 'tr', 'ar'];
        if (supported.includes(deviceLang)) setLang(deviceLang);
      }
      if (savedEffect) setActiveEffect(savedEffect as EffectType);
      if (savedIntensity) setEffectIntensity(parseInt(savedIntensity));
      if (savedVolume) {
        const v = parseFloat(savedVolume);
        setVolumeState(v);
        if (player) { try { player.volume = v; } catch {} }
      }
      if (savedStation) {
        const idx = parseInt(savedStation);
        stationIndexRef.current = idx;
        setStationIndex(idx);
        const station = RADIO_STATIONS[idx] || RADIO_STATIONS[0];
        setCurrentStation(station);
        setCurrentStationUrl(station.url);
      } else {
        setCurrentStation(RADIO_STATIONS[0]);
      }
      if (savedAutoChange) setAutoChange(savedAutoChange === 'true');
      if (savedInterval) setAutoChangeInterval(parseInt(savedInterval));
    } catch (e) {
      console.log('Load error:', e);
      setCurrentStation(RADIO_STATIONS[0]);
    }
  };

  const playStation = useCallback((station: RadioStation) => {
    setCurrentStation(station);
    setCurrentStationUrl(station.url);
    // The player will automatically update because currentStationUrl changed
    // We need to manually trigger play since replace might not auto-play
    setTimeout(() => {
      try { player.play(); } catch {}
    }, 300);
  }, [player]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    try {
      if (playerStatus?.playing) {
        player.pause();
        isPlayingRef.current = false;
      } else {
        player.play();
        isPlayingRef.current = true;
      }
    } catch (e) {
      console.log('togglePlay error:', e);
    }
  }, [player, playerStatus?.playing]);

  const nextStation = useCallback(() => {
    const next = (stationIndexRef.current + 1) % RADIO_STATIONS.length;
    stationIndexRef.current = next;
    setStationIndex(next);
    AsyncStorage.setItem('stationIndex', String(next));
    playStation(RADIO_STATIONS[next]);
  }, [playStation]);

  const prevStation = useCallback(() => {
    const prev = (stationIndexRef.current - 1 + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    stationIndexRef.current = prev;
    setStationIndex(prev);
    AsyncStorage.setItem('stationIndex', String(prev));
    playStation(RADIO_STATIONS[prev]);
  }, [playStation]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    AsyncStorage.setItem('volume', String(clamped));
    if (player) {
      try { player.volume = clamped; } catch {}
    }
  }, [player]);

  // AppState handler for battery optimization
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (!player) return;
      if (state === 'background' || state === 'inactive') {
        // Keep playing in background (staysActiveInBackground is true)
      } else if (state === 'active') {
        if (isPlayingRef.current) {
          try { player.play(); } catch {}
        }
      }
    });
    return () => sub.remove();
  }, [player]);

  // Sync isPlaying ref
  useEffect(() => {
    isPlayingRef.current = playerStatus?.playing ?? false;
  }, [playerStatus?.playing]);

  // Auto-change wallpaper timer
  useEffect(() => {
    if (autoChangeTimerRef.current) clearInterval(autoChangeTimerRef.current);
    if (autoChange && wallpapers.length > 1) {
      autoChangeTimerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % wallpapers.length);
      }, autoChangeInterval);
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
