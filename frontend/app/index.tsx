import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/colors';

const { width: SW, height: SH } = Dimensions.get('window');

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * SW,
  y: Math.random() * SH * 0.7,
  size: 1 + Math.random() * 3,
}));

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withDelay(300, withSpring(1, { damping: 12, stiffness: 80 }));
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 700 }));
    ringScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 60 }));
    ringOpacity.value = withDelay(200, withTiming(0.7, { duration: 800 }));
    glowOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
    titleOpacity.value = withDelay(800, withTiming(1, { duration: 700 }));
    subtitleOpacity.value = withDelay(1100, withTiming(1, { duration: 700 }));

    const timer = setTimeout(() => {
      logoOpacity.value = withTiming(0, { duration: 400 });
      titleOpacity.value = withTiming(0, { duration: 400 });
      subtitleOpacity.value = withTiming(0, { duration: 400 });
      setTimeout(() => router.replace('/(tabs)'), 450);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));

  return (
    <LinearGradient colors={['#000b04', '#031409', '#052e16', '#020b04']} locations={[0, 0.3, 0.7, 1]} style={styles.container}>
      {STARS.map(star => (
        <View key={star.id} style={[styles.star, { left: star.x, top: star.y, width: star.size, height: star.size, borderRadius: star.size / 2 }]} />
      ))}
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.logoCircle, logoStyle]}>
        <LinearGradient colors={['rgba(21,128,61,0.9)', 'rgba(5,46,22,0.95)']} style={styles.logoGrad}>
          <Text style={styles.logoLeaf}>{'\u{1F33F}'}</Text>
          <Text style={styles.logoStars}>{'\u2726'} {'\u2726'} {'\u2726'}</Text>
          <Text style={styles.logoCam}>{'\u25CE'}</Text>
        </LinearGradient>
      </Animated.View>
      <Animated.Text style={[styles.appName, titleStyle]}>RARE SHOT</Animated.Text>
      <Animated.Text style={[styles.appSubtitle, subtitleStyle]}>LIVE WALLPAPER</Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.7)' },
  glow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(74,222,128,0.08)',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 60, elevation: 0,
  },
  ring: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)',
  },
  logoCircle: {
    width: 130, height: 130, borderRadius: 65, overflow: 'hidden', marginBottom: 32,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.5)',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 8,
  },
  logoGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoLeaf: { fontSize: 36, marginBottom: 2 },
  logoStars: { fontSize: 10, color: COLORS.gold, letterSpacing: 4, marginBottom: 2 },
  logoCam: { fontSize: 22, color: COLORS.accent },
  appName: {
    fontSize: 32, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 6, marginBottom: 8,
    textShadowColor: COLORS.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  appSubtitle: { fontSize: 13, fontWeight: '400', color: COLORS.textSecondary, letterSpacing: 5, textTransform: 'uppercase' },
});
