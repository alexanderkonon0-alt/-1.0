import React, { useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as IntentLauncher from 'expo-intent-launcher';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useApp, WallpaperItem } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { setWallpaperUri, launchWallpaperPicker, isWallpaperModuleAvailable } from '../../modules/wallpaper';

const { width: SW, height: SH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentWallpaper, nextWallpaper, prevWallpaper,
    isPlaying, currentStation, activeEffect, language,
    addWallpaper, setCurrentWallpaper,
  } = useApp();
  const t = getTranslation(language);

  const imgOpacity = useSharedValue(1);

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

  // Set live wallpaper on Android
  const handleSetLiveWallpaper = useCallback(async () => {
    if (Platform.OS !== 'android') {
      // On web/iOS just show info
      Alert.alert(
        t.liveWallpaper,
        'Live wallpapers are only available on Android devices. Please use the APK build.',
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isWallpaperModuleAvailable() && currentWallpaper?.uri) {
      try {
        await setWallpaperUri(currentWallpaper.uri);
        await launchWallpaperPicker();
      } catch (e: any) {
        // fallback: open Android wallpaper settings
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.SET_WALLPAPER');
        } catch {
          Alert.alert(t.liveWallpaper, t.wallpaperSet);
        }
      }
    } else {
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.SET_WALLPAPER');
      } catch {
        Alert.alert(t.liveWallpaper, t.wallpaperSet);
      }
    }
  }, [currentWallpaper, t]);

  // Pick photo from file explorer
  const handlePickPhoto = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newItem: WallpaperItem = {
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          uri: asset.uri,
          type: 'photo',
          name: asset.name || 'Photo',
        };
        addWallpaper(newItem);
        setCurrentWallpaper(newItem);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.log('DocumentPicker error:', e);
    }
  }, [addWallpaper, setCurrentWallpaper]);

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
            <Text style={styles.appNameSmall}>{'\u{1F33F}'} RARE SHOT</Text>
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

      {/* Bottom section with buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 68 }]} pointerEvents="box-none">
        {currentWallpaper && (
          <BlurView intensity={20} tint="dark" style={styles.wallpaperInfo}>
            <View style={styles.wallpaperInfoInner}>
              <Ionicons name="image-outline" size={14} color={COLORS.accent} />
              <Text style={styles.wallpaperName} numberOfLines={1}>{currentWallpaper.name}</Text>
            </View>
          </BlurView>
        )}

        {/* Action buttons row */}
        <View style={styles.actionRow}>
          {/* Set Live Wallpaper button */}
          <TouchableOpacity
            testID="set-live-wallpaper-btn"
            onPress={handleSetLiveWallpaper}
            activeOpacity={0.8}
            style={styles.actionBtnContainer}
          >
            <LinearGradient
              colors={['#4ade80', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtnGrad}
            >
              <Ionicons name="phone-portrait-outline" size={18} color="#000" />
              <Text style={styles.actionBtnTextDark}>{t.setAsWallpaper}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Pick from file explorer button */}
          <TouchableOpacity
            testID="pick-photo-btn"
            onPress={handlePickPhoto}
            activeOpacity={0.8}
            style={styles.actionBtnContainer}
          >
            <BlurView intensity={20} tint="dark" style={styles.pickBtnBlur}>
              <View style={styles.pickBtnInner}>
                <Ionicons name="folder-open-outline" size={18} color={COLORS.accent} />
                <Text style={styles.actionBtnTextLight}>{t.addPhoto}</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomHints}>
          {activeEffect !== 'none' && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>{'\u2728'} {t.effects}</Text>
            </View>
          )}
          {isPlaying && currentStation && (
            <View style={styles.hint}>
              <Ionicons name="musical-notes-outline" size={11} color={COLORS.accent} />
              <Text style={styles.hintText}> {currentStation.name}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, zIndex: 10,
  },
  topLeft: { borderRadius: 20, overflow: 'hidden' },
  topLeftInner: {
    backgroundColor: 'rgba(0,10,5,0.5)', paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 20,
  },
  appNameSmall: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  settingsBtn: { borderRadius: 22, overflow: 'hidden' },
  settingsBtnBlur: { borderRadius: 22, overflow: 'hidden' },
  settingsBtnInner: {
    backgroundColor: 'rgba(0,10,5,0.5)', padding: 10,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 22,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, zIndex: 5, alignItems: 'center',
  },
  wallpaperInfo: { borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  wallpaperInfoInner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,10,5,0.55)', paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 16,
  },
  wallpaperName: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '500', maxWidth: 200 },
  actionRow: {
    flexDirection: 'row', gap: 10, marginBottom: 10, width: '100%',
  },
  actionBtnContainer: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  actionBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
  },
  actionBtnTextDark: { color: '#000', fontSize: 14, fontWeight: '800' },
  pickBtnBlur: { borderRadius: 16, overflow: 'hidden' },
  pickBtnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: 'rgba(0,10,5,0.6)', borderWidth: 1, borderColor: COLORS.borderGreen,
  },
  actionBtnTextLight: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  bottomHints: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  hint: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  hintText: { color: COLORS.textMuted, fontSize: 11 },
  swipeHint: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 4 },
  arrowBtn: {
    position: 'absolute', top: '50%', marginTop: -20,
    width: 36, height: 40, alignItems: 'center', justifyContent: 'center', zIndex: 8,
  },
  arrowLeft: { left: 8 },
  arrowRight: { right: 8 },
});
