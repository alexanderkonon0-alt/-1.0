import React, { useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, FadeIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { COLORS } from '../constants/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_W } = Dimensions.get('window');
const SLIDER_H = 5;
const THUMB_SIZE = 22;

export const VolumeWidget: React.FC = () => {
  const {
    volume, setVolume, isPlaying, togglePlay,
    nextStation, prevStation, currentStation,
    isWidgetCollapsed, setIsWidgetCollapsed,
  } = useApp();

  const insets = useSafeAreaInsets();
  const TAB_BAR_H = 70 + insets.bottom;
  const WIDGET_BOTTOM = TAB_BAR_H + 6;

  const [trackWidth, setTrackWidth] = useState(200);

  // Store actual thumb x position as shared value
  const thumbX = useSharedValue(volume * Math.max(1, 200 - THUMB_SIZE));

  // Capture starting thumb position on gesture begin
  const startXRef = useRef(0);

  const haptic = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  }, []);

  const updateVol = useCallback((v: number) => {
    setVolume(v);
  }, [setVolume]);

  // Keep thumb in sync when volume changes externally (e.g. from AppContext)
  React.useEffect(() => {
    const tw = Math.max(1, trackWidth - THUMB_SIZE);
    thumbX.value = withSpring(volume * tw, { damping: 20, stiffness: 200 });
  }, [volume, trackWidth]);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      // Capture exact thumb position at gesture start
      startXRef.current = thumbX.value;
    })
    .onUpdate((e) => {
      const tw = Math.max(1, trackWidth - THUMB_SIZE);
      const newX = Math.max(0, Math.min(tw, startXRef.current + e.translationX));
      thumbX.value = newX;
      runOnJS(updateVol)(newX / tw);
    })
    .onEnd(() => {
      runOnJS(haptic)();
    });

  const tapGesture = Gesture.Tap().onEnd((e) => {
    const tw = Math.max(1, trackWidth - THUMB_SIZE);
    const newX = Math.max(0, Math.min(tw, e.x - THUMB_SIZE / 2));
    thumbX.value = withSpring(newX, { damping: 20, stiffness: 300 });
    runOnJS(updateVol)(newX / tw);
    runOnJS(haptic)();
  });

  const sliderGesture = Gesture.Exclusive(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(4, thumbX.value + THUMB_SIZE / 2),
  }));

  const volIcon = volume === 0 ? 'volume-mute' : volume < 0.4 ? 'volume-low' : volume < 0.75 ? 'volume-medium' : 'volume-high';

  const handleCollapse = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsWidgetCollapsed(true);
    haptic();
  }, [setIsWidgetCollapsed, haptic]);

  const handleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsWidgetCollapsed(false);
    haptic();
  }, [setIsWidgetCollapsed, haptic]);

  if (isWidgetCollapsed) {
    return (
      <Animated.View entering={FadeIn.duration(200)} style={[styles.collapsedContainer, { bottom: WIDGET_BOTTOM }]}>
        <TouchableOpacity testID="widget-expand-fab" onPress={handleExpand} activeOpacity={0.8}>
          <BlurView intensity={18} tint="dark" style={styles.collapsedBlur}>
            <View style={styles.collapsedPill}>
              <Ionicons name={isPlaying ? 'musical-notes' : 'musical-notes-outline'} size={16} color={COLORS.accent} />
              <TouchableOpacity onPress={togglePlay} style={styles.collapsedPlay} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={28} color={COLORS.accent} />
              </TouchableOpacity>
              <Text style={styles.collapsedName} numberOfLines={1}>
                {currentStation?.emoji} {currentStation?.name || '\u2014'}
              </Text>
              <Ionicons name="chevron-up" size={14} color={COLORS.textMuted} />
            </View>
          </BlurView>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.expandedContainer, { bottom: WIDGET_BOTTOM }]}>
      <BlurView intensity={32} tint="dark" style={styles.expandedBlur}>
        <View style={styles.expandedInner}>
          <View style={styles.stationRow}>
            <TouchableOpacity testID="widget-prev-btn" onPress={prevStation} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="play-skip-back" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity testID="widget-play-btn" onPress={togglePlay} style={styles.playBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={36} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity testID="widget-next-btn" onPress={nextStation} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="play-skip-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.stationInfo}>
              <Text style={styles.stationName} numberOfLines={1}>
                {currentStation?.emoji} {currentStation?.name || '\u2014'}
              </Text>
              <Text style={styles.stationGenre}>{currentStation?.genre || ''}</Text>
            </View>
            <TouchableOpacity testID="widget-collapse-btn" onPress={handleCollapse} style={styles.iconBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={styles.collapseBtn}>
                <Ionicons name="chevron-down" size={14} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.volumeRow}>
            <Ionicons name={volIcon as any} size={15} color={COLORS.textMuted} />
            <GestureDetector gesture={sliderGesture}>
              <View
                style={styles.sliderHitArea}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && w !== trackWidth) {
                    setTrackWidth(w);
                    // Re-sync thumb position on layout change
                    thumbX.value = volume * Math.max(1, w - THUMB_SIZE);
                  }
                }}
              >
                <View style={styles.trackBg} />
                <Animated.View style={[styles.trackFill, fillStyle]} />
                <Animated.View style={[styles.thumb, thumbStyle]} />
              </View>
            </GestureDetector>
            <Text style={styles.volPct}>{Math.round(volume * 100)}%</Text>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  collapsedContainer: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 14,
  },
  collapsedBlur: { borderRadius: 30, overflow: 'hidden' },
  collapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(3,18,8,0.82)',
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    borderRadius: 30,
    maxWidth: SCREEN_W - 80,
  },
  collapsedPlay: { marginHorizontal: 2 },
  collapsedName: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', flex: 1, flexShrink: 1 },
  expandedContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 60,
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  expandedBlur: { borderRadius: 22, overflow: 'hidden' },
  expandedInner: {
    backgroundColor: 'rgba(3, 18, 8, 0.88)',
    borderWidth: 1,
    borderColor: COLORS.borderGreen,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  stationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stationInfo: { flex: 1, marginHorizontal: 6, overflow: 'hidden' },
  stationName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  stationGenre: { color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  iconBtn: { padding: 5, alignItems: 'center', justifyContent: 'center' },
  playBtn: { alignItems: 'center', justifyContent: 'center' },
  collapseBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderHitArea: { flex: 1, height: 36, justifyContent: 'center', position: 'relative' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: SLIDER_H, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: SLIDER_H / 2 },
  trackFill: { position: 'absolute', left: 0, height: SLIDER_H, backgroundColor: COLORS.accent, borderRadius: SLIDER_H / 2, minWidth: 4 },
  thumb: {
    position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.white, top: (36 - THUMB_SIZE) / 2,
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 5,
    borderWidth: 2, borderColor: COLORS.accent,
  },
  volPct: { color: COLORS.textMuted, fontSize: 10, width: 32, textAlign: 'right', fontWeight: '600' },
});
