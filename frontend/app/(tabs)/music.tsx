import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { RADIO_STATIONS, RadioStation } from '../../constants/radioStations';

const PulsingDot = ({ active }: { active: boolean }) => {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    if (active) {
      scale.value = withRepeat(withSequence(withTiming(1.4, { duration: 500 }), withTiming(1, { duration: 500 })), -1, false);
    } else {
      scale.value = 1;
    }
  }, [active]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.dot, active && styles.dotActive, style]} />
  );
};

export default function MusicScreen() {
  const insets = useSafeAreaInsets();
  const { isPlaying, currentStation, playStation, nextStation, prevStation, togglePlay, volume, language } = useApp();
  const t = getTranslation(language);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePlayStation = useCallback(async (station: RadioStation) => {
    setLoadingId(station.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await playStation(station);
    setLoadingId(null);
  }, [playStation]);

  const pickLocalMusic = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        // Play first track immediately
        const asset = result.assets[0];
        const localStation: RadioStation = {
          id: 'local_music_' + Date.now(),
          name: asset.name || 'Local Music',
          description: `${result.assets.length} tracks`,
          url: asset.uri,
          genre: 'Local',
          emoji: '\u{1F3B5}',
        };
        await playStation(localStation);
        
        // Save all tracks as playlist
        const playlist = result.assets.map((a, i) => ({
          id: `local_${Date.now()}_${i}`,
          name: a.name || `Track ${i + 1}`,
          uri: a.uri,
        }));
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('local_playlist', JSON.stringify(playlist));
        } catch {}
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('\u{2705}', `Added ${result.assets.length} track(s)`);
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  }, [playStation]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#010f05', '#041a0a', '#031209']} style={StyleSheet.absoluteFill} />

      {/* Now Playing Card */}
      <BlurView intensity={25} tint="dark" style={[styles.nowPlayingCard, { marginTop: insets.top + 16 }]}>
        <LinearGradient
          colors={['rgba(21,128,61,0.35)', 'rgba(5,46,22,0.4)']}
          style={styles.nowPlayingGrad}
        >
          <View style={styles.nowPlayingContent}>
            <Text style={styles.nowPlayingLabel}>{t.nowPlaying}</Text>
            <View style={styles.nowPlayingInfo}>
              <Text style={styles.stationEmoji}>{currentStation?.emoji || '🎵'}</Text>
              <View style={styles.stationTextArea}>
                <Text style={styles.stationName} numberOfLines={1}>
                  {currentStation?.name || t.tapToPlay}
                </Text>
                <Text style={styles.stationGenre} numberOfLines={1}>
                  {currentStation?.genre || '—'}
                </Text>
              </View>
              <PulsingDot active={isPlaying} />
            </View>
            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity testID="music-prev-btn" onPress={prevStation} style={styles.ctrlBtn}>
                <Ionicons name="play-skip-back" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity testID="music-play-btn" onPress={togglePlay} style={styles.playBtn}>
                <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.playGrad}>
                  <Ionicons name={isPlaying ? 'pause' : 'play'} size={30} color={COLORS.white} />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity testID="music-next-btn" onPress={nextStation} style={styles.ctrlBtn}>
                <Ionicons name="play-skip-forward" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {/* Volume indicator */}
            <View style={styles.volRow}>
              <Ionicons name="volume-low-outline" size={14} color={COLORS.textMuted} />
              <View style={styles.volTrack}>
                <View style={[styles.volFill, { width: `${volume * 100}%` }]} />
              </View>
              <Ionicons name="volume-high-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.volPct}>{Math.round(volume * 100)}%</Text>
            </View>
          </View>
        </LinearGradient>
      </BlurView>

      {/* Station List */}
      <FlatList
        data={RADIO_STATIONS}
        keyExtractor={s => s.id}
        style={styles.list}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 210, paddingTop: 8 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>{t.radioStations}</Text>
            <TouchableOpacity testID="add-local-music-btn" onPress={pickLocalMusic} style={styles.localMusicBtn}>
              <BlurView intensity={20} tint="dark" style={styles.localMusicBlur}>
                <View style={styles.localMusicInner}>
                  <Ionicons name="folder-open-outline" size={16} color={COLORS.accent} />
                  <Text style={styles.localMusicText}>{t.localMusic}</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = currentStation?.id === item.id;
          const isLoading = loadingId === item.id;
          return (
            <TouchableOpacity
              testID={`station-${item.id}`}
              style={[styles.stationCard, isActive && styles.stationCardActive]}
              onPress={() => handlePlayStation(item)}
              activeOpacity={0.8}
            >
              <BlurView intensity={15} tint="dark" style={styles.stationCardBlur}>
                <View style={[styles.stationCardInner, isActive && styles.stationCardInnerActive]}>
                  <Text style={styles.stationCardEmoji}>{item.emoji}</Text>
                  <View style={styles.stationCardText}>
                    <Text style={[styles.stationCardName, isActive && styles.stationCardNameActive]}>{item.name}</Text>
                    <Text style={styles.stationCardDesc} numberOfLines={1}>{item.description}</Text>
                  </View>
                  <View style={styles.stationRight}>
                    <View style={[styles.genreTag, isActive && styles.genreTagActive]}>
                      <Text style={[styles.genreText, isActive && styles.genreTextActive]}>{item.genre}</Text>
                    </View>
                    {isLoading ? (
                      <Ionicons name="hourglass-outline" size={18} color={COLORS.textMuted} />
                    ) : isActive && isPlaying ? (
                      <PulsingDot active={true} />
                    ) : (
                      <Ionicons name="play-circle-outline" size={22} color={isActive ? COLORS.accent : COLORS.textMuted} />
                    )}
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  nowPlayingCard: { marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGreen },
  nowPlayingGrad: { borderRadius: 24 },
  nowPlayingContent: { padding: 18 },
  nowPlayingLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  nowPlayingInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stationEmoji: { fontSize: 36, marginRight: 12 },
  stationTextArea: { flex: 1 },
  stationName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  stationGenre: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 16 },
  ctrlBtn: { padding: 8 },
  playBtn: { borderRadius: 32, overflow: 'hidden' },
  playGrad: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
  volFill: { height: 3, backgroundColor: COLORS.accent, borderRadius: 2 },
  volPct: { color: COLORS.textMuted, fontSize: 11, width: 30, textAlign: 'right' },
  list: { flex: 1, marginTop: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  listTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  localMusicBtn: { borderRadius: 12, overflow: 'hidden' },
  localMusicBlur: { borderRadius: 12, overflow: 'hidden' },
  localMusicInner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.glass, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.borderGreen, borderRadius: 12 },
  localMusicText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  stationCard: { marginBottom: 10, borderRadius: 16, overflow: 'hidden' },
  stationCardActive: {},
  stationCardBlur: { borderRadius: 16, overflow: 'hidden' },
  stationCardInner: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  stationCardInnerActive: { borderColor: COLORS.borderGreen, backgroundColor: 'rgba(15,60,30,0.7)' },
  stationCardEmoji: { fontSize: 28, marginRight: 12 },
  stationCardText: { flex: 1 },
  stationCardName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  stationCardNameActive: { color: COLORS.accent },
  stationCardDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  stationRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genreTag: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  genreTagActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accent },
  genreText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  genreTextActive: { color: COLORS.accent },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted },
  dotActive: { backgroundColor: COLORS.accent, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
});
