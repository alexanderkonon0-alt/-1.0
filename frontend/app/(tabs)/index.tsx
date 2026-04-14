import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Haptics from 'expo-haptics';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';

const { width: SW, height: SH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentWallpaper, nextWallpaper, prevWallpaper, isPlaying, currentStation, activeEffect, language } = useApp();
  const t = getTranslation(language);

  const translateX = useSharedValue(0);
  const imgOpacity = useSharedValue(1);
  const doubleTapCount = useRef(0);
  const doubleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {}, []);

  const haptic = useCallback(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), []);

  const goNext = useCallback(() => {
    haptic();
    imgOpacity.value = withTiming(0.3, { duration: 150 }, () => {
      runOnJS(nextWallpaper)();
      imgOpacity.value = withTiming(1, { duration: 300 });
    });
  }, [nextWallpaper]);

  const goPrev = useCallback(() => {
    haptic();
    imgOpacity.value = withTiming(0.3, { duration: 150 }, () => {
      runOnJS(prevWallpaper)();
      imgOpacity.value = withTiming(1, { duration: 300 });
    });
  }, [prevWallpaper]);

  const handleDoubleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    nextWallpaper();
  }, [nextWallpaper]);

  const swipeGesture = Gesture.Pan()
    .onEnd((e) => {
      if (Math.abs(e.translationX) > Math.abs(e.translationY) && Math.abs(e.translationX) > 60) {
        if (e.translationX < 0) runOnJS(goNext)();
        else runOnJS(goPrev)();
      }
      if (e.translationY < -80) {
        // swipe up: show effects hint
        runOnJS(haptic)();
      }
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleDoubleTap)();
    });

  const gesture = Gesture.Simultaneous(swipeGesture, tapGesture);

  const wallpaperStyle = useAnimatedStyle(() => ({
    opacity: imgOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background wallpaper */}
      <Animated.View style={[StyleSheet.absoluteFill, wallpaperStyle]}>
        {currentWallpaper?.uri ? (
          <Image
            source={{ uri: currentWallpaper.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={400}
            testID="home-wallpaper-bg"
          />
        ) : (
          <LinearGradient colors={['#010f05', '#052e16', '#0a4a20']} style={StyleSheet.absoluteFill} />
        )}
      </Animated.View>

      {/* Dark overlay gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'transparent', 'rgba(0,0,0,0.7)']}
        locations={[0, 0.25, 0.65, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Gesture area */}
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} />
      </GestureDetector>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <BlurView intensity={20} tint="dark" style={styles.topLeft}>
          <View style={styles.topLeftInner}>
            <Text style={styles.appNameSmall}>🌿 RARE SHOT</Text>
          </View>
        </BlurView>
        <TouchableOpacity
          testID="settings-btn"
          onPress={() => router.push('/settings')}
          style={styles.settingsBtn}
        >
          <BlurView intensity={20} tint="dark" style={styles.settingsBtnBlur}>
            <View style={styles.settingsBtnInner}>
              <Ionicons name="settings-outline" size={20} color={COLORS.textPrimary} />
            </View>
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Bottom info bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 68 }]} pointerEvents="none">
        {currentWallpaper && (
          <BlurView intensity={20} tint="dark" style={styles.wallpaperInfo}>
            <View style={styles.wallpaperInfoInner}>
              <Ionicons name="image-outline" size={14} color={COLORS.accent} />
              <Text style={styles.wallpaperName} numberOfLines={1}>{currentWallpaper.name}</Text>
            </View>
          </BlurView>
        )}
        <View style={styles.bottomHints}>
          {activeEffect !== 'none' && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>✨ {t.effects}</Text>
            </View>
          )}
          {isPlaying && currentStation && (
            <View style={styles.hint}>
              <Ionicons name="musical-notes-outline" size={11} color={COLORS.accent} />
              <Text style={styles.hintText} numberOfLines={1}> {currentStation.name}</Text>
            </View>
          )}
        </View>
        <Text style={styles.swipeHint}>{t.gestureInfo}</Text>
      </View>

      {/* Swipe arrows */}
      <TouchableOpacity testID="prev-wallpaper-btn" style={[styles.arrowBtn, styles.arrowLeft]} onPress={goPrev}>
        <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
      <TouchableOpacity testID="next-wallpaper-btn" style={[styles.arrowBtn, styles.arrowRight]} onPress={goNext}>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  topLeft: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  topLeftInner: {
    backgroundColor: 'rgba(0,10,5,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
  },
  appNameSmall: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  settingsBtn: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  settingsBtnBlur: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  settingsBtnInner: {
    backgroundColor: 'rgba(0,10,5,0.5)',
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
  },
  timeContainer: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  timeText: {
    fontSize: 64,
    fontWeight: '200',
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 5,
    alignItems: 'center',
  },
  wallpaperInfo: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  wallpaperInfoInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,10,5,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  wallpaperName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 200,
  },
  bottomHints: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  swipeHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginBottom: 4,
  },
  arrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
});
