import React, { useEffect, useRef, memo } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { EffectType } from '../contexts/AppContext';

const { width: SW, height: SH } = Dimensions.get('window');

// ---- Rain Drop ----
const RainDrop = memo(({ x, delay, duration }: { x: number; delay: number; duration: number }) => {
  const y = useSharedValue(-30);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(SH + 30, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(y);
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.rain, { left: x }, s]} />;
});

// ---- Snow Flake ----
const SnowFlake = memo(({ x, delay, duration, size }: { x: number; delay: number; duration: number; size: number }) => {
  const y = useSharedValue(-20);
  const dx = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(SH + 20, { duration, easing: Easing.linear }), -1, false));
    dx.value = withRepeat(withSequence(withTiming(15, { duration: 1200 }), withTiming(-15, { duration: 1200 })), -1, true);
    return () => { cancelAnimation(y); cancelAnimation(dx); };
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { translateX: dx.value }] }));
  return <Animated.View style={[styles.snow, { left: x, width: size, height: size, borderRadius: size / 2 }, s]} />;
});

// ---- Leaf ----
const LEAF_COLORS = ['rgba(74,222,128,0.7)', 'rgba(34,197,94,0.65)', 'rgba(21,128,61,0.7)', 'rgba(251,191,36,0.6)', 'rgba(134,239,172,0.6)'];
const Leaf = memo(({ x, delay, duration, color }: { x: number; delay: number; duration: number; color: string }) => {
  const y = useSharedValue(-20);
  const rot = useSharedValue(0);
  const dx = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(SH + 30, { duration, easing: Easing.linear }), -1, false));
    rot.value = withRepeat(withTiming(360, { duration: 3000, easing: Easing.linear }), -1, false);
    dx.value = withRepeat(withSequence(withTiming(20, { duration: 1500 }), withTiming(-20, { duration: 1500 })), -1, true);
    return () => { cancelAnimation(y); cancelAnimation(rot); cancelAnimation(dx); };
  }, []);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { translateX: dx.value }, { rotate: `${rot.value}deg` }],
  }));
  return <Animated.View style={[styles.leaf, { left: x, backgroundColor: color }, s]} />;
});

// ---- Sparkle ----
const Sparkle = memo(({ x, y: yPos, delay, size }: { x: number; y: number; delay: number; size: number }) => {
  const op = useSharedValue(0);
  const sc = useSharedValue(0);
  useEffect(() => {
    op.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0, { duration: 800 })), -1, false));
    sc.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0.3, { duration: 800 })), -1, false));
    return () => { cancelAnimation(op); cancelAnimation(sc); };
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ scale: sc.value }] }));
  return <Animated.Text style={[styles.sparkle, { left: x, top: yPos, fontSize: size }, s]}>✦</Animated.Text>;
});

// ---- Bubble ----
const Bubble = memo(({ x, delay, duration, size }: { x: number; delay: number; duration: number; size: number }) => {
  const y = useSharedValue(SH + 20);
  const op = useSharedValue(0.7);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(-20, { duration, easing: Easing.out(Easing.quad) }), -1, false));
    op.value = withDelay(delay, withRepeat(withSequence(withTiming(0.8, { duration: duration * 0.7 }), withTiming(0, { duration: duration * 0.3 })), -1, false));
    return () => { cancelAnimation(y); cancelAnimation(op); };
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: op.value }));
  return <Animated.View style={[styles.bubble, { left: x, width: size, height: size, borderRadius: size / 2 }, s]} />;
});

// ---- Firefly ----
const Firefly = memo(({ x, y: yStart, delay }: { x: number; y: number; delay: number }) => {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const op = useSharedValue(0);
  useEffect(() => {
    const dx = (Math.random() - 0.5) * 120;
    const dy = (Math.random() - 0.5) * 120;
    const dur = 2000 + Math.random() * 2000;
    tx.value = withDelay(delay, withRepeat(withSequence(withTiming(dx, { duration: dur }), withTiming(-dx, { duration: dur })), -1, true));
    ty.value = withDelay(delay, withRepeat(withSequence(withTiming(dy, { duration: dur * 0.8 }), withTiming(-dy, { duration: dur * 0.8 })), -1, true));
    op.value = withDelay(delay, withRepeat(withSequence(withTiming(0.9, { duration: 800 }), withTiming(0.1, { duration: 800 })), -1, true));
    return () => { cancelAnimation(tx); cancelAnimation(ty); cancelAnimation(op); };
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }], opacity: op.value }));
  return <Animated.View style={[styles.firefly, { left: x, top: yStart }, s]} />;
});

// ---- Petal ----
const Petal = memo(({ x, delay, duration }: { x: number; delay: number; duration: number }) => {
  const y = useSharedValue(-20);
  const rot = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(SH + 30, { duration, easing: Easing.linear }), -1, false));
    rot.value = withRepeat(withTiming(180, { duration: 2500, easing: Easing.linear }), -1, false);
    return () => { cancelAnimation(y); cancelAnimation(rot); };
  }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${rot.value}deg` }] }));
  return <Animated.Text style={[styles.petal, { left: x }, s]}>🌸</Animated.Text>;
});

// ---- Main Component ----
interface Props {
  type: EffectType;
  intensity: number;
}

const countMap: Record<number, number> = { 1: 20, 2: 40, 3: 65 };

export const ParticleSystem: React.FC<Props> = ({ type, intensity }) => {
  if (type === 'none') return null;
  const count = countMap[intensity] || 40;

  const particles = Array.from({ length: count }, (_, i) => {
    const x = Math.random() * SW;
    const delay = Math.random() * 3000;
    switch (type) {
      case 'rain':
        return <RainDrop key={i} x={x} delay={delay} duration={300 + Math.random() * 400} />;
      case 'snow':
        return <SnowFlake key={i} x={x} delay={delay} duration={2500 + Math.random() * 2500} size={3 + Math.random() * 7} />;
      case 'leaves':
        return <Leaf key={i} x={x} delay={delay} duration={3000 + Math.random() * 3000} color={LEAF_COLORS[i % LEAF_COLORS.length]} />;
      case 'sparkles':
        return <Sparkle key={i} x={x} y={Math.random() * SH} delay={delay} size={10 + Math.random() * 14} />;
      case 'bubbles':
        return <Bubble key={i} x={x} delay={delay} duration={3000 + Math.random() * 4000} size={8 + Math.random() * 20} />;
      case 'fireflies':
        return <Firefly key={i} x={x} y={Math.random() * SH} delay={delay} />;
      case 'petals':
        return <Petal key={i} x={x} delay={delay} duration={4000 + Math.random() * 3000} />;
      default:
        return null;
    }
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles}
    </View>
  );
};

const styles = StyleSheet.create({
  rain: {
    position: 'absolute',
    width: 1.5,
    height: 18,
    backgroundColor: 'rgba(180,220,255,0.55)',
    borderRadius: 1,
  },
  snow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  leaf: {
    position: 'absolute',
    width: 12,
    height: 7,
    borderRadius: 7,
  },
  sparkle: {
    position: 'absolute',
    color: 'rgba(251,191,36,0.85)',
    textShadowColor: 'rgba(251,191,36,0.6)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(74,222,128,0.6)',
    backgroundColor: 'transparent',
  },
  firefly: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(180,255,100,0.9)',
    shadowColor: 'rgba(180,255,100,1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  petal: {
    position: 'absolute',
    fontSize: 14,
  },
});
