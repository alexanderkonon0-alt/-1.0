import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useApp, EffectType } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';

const { width: SW } = Dimensions.get('window');

const EFFECTS: { type: EffectType; icon: string; emoji: string; color: string }[] = [
  { type: 'none', icon: 'ban-outline', emoji: '\u2014', color: COLORS.textMuted },
  { type: 'rain', icon: 'rainy-outline', emoji: '\u{1F327}', color: '#60a5fa' },
  { type: 'snow', icon: 'snow-outline', emoji: '\u2744\uFE0F', color: '#e0f2fe' },
  { type: 'leaves', icon: 'leaf-outline', emoji: '\u{1F343}', color: '#4ade80' },
  { type: 'sparkles', icon: 'sparkles-outline', emoji: '\u2728', color: '#fbbf24' },
  { type: 'bubbles', icon: 'ellipse-outline', emoji: '\u{1FAE7}', color: '#a7f3d0' },
  { type: 'fireflies', icon: 'flashlight-outline', emoji: '\u2B50', color: '#d9f99d' },
  { type: 'petals', icon: 'flower-outline', emoji: '\u{1F338}', color: '#fda4af' },
];

const INTENSITIES = [1, 2, 3];
const SPEEDS = [1, 2, 3];

const MiniPreview = ({ type, intensity, speed }: { type: EffectType; intensity: number; speed: number }) => {
  const op = useSharedValue(0.4);
  const y = useSharedValue(0);
  const speedMs = speed === 1 ? 1200 : speed === 2 ? 700 : 400;
  React.useEffect(() => {
    if (type !== 'none') {
      op.value = withRepeat(withSequence(withTiming(1, { duration: speedMs }), withTiming(0.3, { duration: speedMs })), -1, true);
      y.value = withRepeat(withSequence(withTiming(-8, { duration: speedMs * 1.2 }), withTiming(8, { duration: speedMs * 1.2 })), -1, true);
    }
  }, [type, speed]);
  const aStyle = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateY: y.value }] }));
  if (type === 'none') return <View style={styles.previewPlaceholder}><Text style={styles.previewNone}>\u2014</Text></View>;
  const eff = EFFECTS.find(e => e.type === type);
  return (
    <View style={styles.previewBox}>
      {Array.from({ length: Math.min(intensity * 3, 9) }).map((_, i) => (
        <Animated.Text key={i} style={[styles.previewParticle, aStyle, { top: `${10 + (i * 10) % 70}%`, left: `${5 + (i * 13) % 85}%` }]}>
          {eff?.emoji}
        </Animated.Text>
      ))}
    </View>
  );
};

export default function EffectsScreen() {
  const insets = useSafeAreaInsets();
  const { activeEffect, setActiveEffect, effectIntensity, setEffectIntensity, effectSpeed, setEffectSpeed, language } = useApp();
  const t = getTranslation(language);

  const intensityLabels: Record<number, string> = { 1: t.low, 2: t.medium, 3: t.high };
  const speedLabels: Record<number, string> = { 1: t.speedSlow || 'Slow', 2: t.speedNormal || 'Normal', 3: t.speedFast || 'Fast' };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#010f05', '#041a0a', '#031209']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{'\u2728'} {t.particles}</Text>

        {/* Current effect preview */}
        <BlurView intensity={20} tint="dark" style={styles.previewCard}>
          <View style={styles.previewCardInner}>
            <Text style={styles.sectionLabel}>{t.preview}</Text>
            <MiniPreview type={activeEffect} intensity={effectIntensity} speed={effectSpeed} />
            <Text style={styles.activeEffectName}>
              {t[`effect${activeEffect.charAt(0).toUpperCase() + activeEffect.slice(1)}` as keyof typeof t] || activeEffect}
            </Text>
          </View>
        </BlurView>

        {/* Effect selector grid */}
        <Text style={styles.sectionTitle}>{t.particles}</Text>
        <View style={styles.effectGrid}>
          {EFFECTS.map(({ type, emoji, color }) => {
            const isActive = activeEffect === type;
            return (
              <TouchableOpacity
                testID={`effect-${type}`}
                key={type}
                style={[styles.effectCard, isActive && styles.effectCardActive]}
                onPress={() => { setActiveEffect(type); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                activeOpacity={0.8}
              >
                <BlurView intensity={15} tint="dark" style={styles.effectBlur}>
                  <LinearGradient
                    colors={isActive ? [`${color}30`, `${color}10`] : ['rgba(5,20,10,0.8)', 'rgba(5,20,10,0.6)']}
                    style={[styles.effectInner, isActive && { borderColor: color }]}
                  >
                    <Text style={styles.effectEmoji}>{emoji}</Text>
                    <Text style={[styles.effectLabel, isActive && { color }]}>
                      {t[`effect${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t] || type}
                    </Text>
                    {isActive && (
                      <View style={[styles.activeCheck, { backgroundColor: color }]}>
                        <Ionicons name="checkmark" size={10} color="#000" />
                      </View>
                    )}
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Intensity selector */}
        {activeEffect !== 'none' && (
          <>
            <View style={styles.intensitySection}>
              <Text style={styles.sectionTitle}>{t.intensity}</Text>
              <View style={styles.intensityRow}>
                {INTENSITIES.map(n => (
                  <TouchableOpacity
                    testID={`intensity-${n}`}
                    key={n}
                    style={[styles.intensityBtn, effectIntensity === n && styles.intensityBtnActive]}
                    onPress={() => { setEffectIntensity(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.intensityBtnText, effectIntensity === n && styles.intensityBtnTextActive]}>
                      {intensityLabels[n]}
                    </Text>
                    <View style={styles.intensityDots}>
                      {Array.from({ length: n }).map((_, i) => (
                        <View key={i} style={[styles.intensityDot, effectIntensity === n && styles.intensityDotActive]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Speed selector */}
            <View style={styles.intensitySection}>
              <Text style={styles.sectionTitle}>{'\u{1F3CE}\uFE0F'} {t.effectSpeed || 'Speed'}</Text>
              <View style={styles.intensityRow}>
                {SPEEDS.map(n => (
                  <TouchableOpacity
                    testID={`speed-${n}`}
                    key={n}
                    style={[styles.intensityBtn, effectSpeed === n && styles.speedBtnActive]}
                    onPress={() => { setEffectSpeed(n); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[styles.intensityBtnText, effectSpeed === n && styles.speedBtnTextActive]}>
                      {speedLabels[n]}
                    </Text>
                    <View style={styles.intensityDots}>
                      {Array.from({ length: n }).map((_, i) => (
                        <View key={i} style={[styles.speedDot, effectSpeed === n && styles.speedDotActive]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 16 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 16 },
  previewCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: COLORS.borderGreen },
  previewCardInner: { backgroundColor: COLORS.glass, padding: 16, alignItems: 'center' },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  previewBox: { width: '100%', height: 100, position: 'relative', overflow: 'hidden', borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  previewPlaceholder: { width: '100%', height: 100, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)' },
  previewNone: { color: COLORS.textMuted, fontSize: 28 },
  previewParticle: { position: 'absolute', fontSize: 16 },
  activeEffectName: { color: COLORS.accent, fontSize: 14, fontWeight: '700', marginTop: 8 },
  sectionTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  effectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  effectCard: { width: (SW - 52) / 4, borderRadius: 16, overflow: 'hidden' },
  effectCardActive: {},
  effectBlur: { borderRadius: 16, overflow: 'hidden' },
  effectInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, gap: 6, position: 'relative' },
  effectEmoji: { fontSize: 26 },
  effectLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  activeCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  intensitySection: { marginBottom: 20 },
  intensityRow: { flexDirection: 'row', gap: 12 },
  intensityBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, alignItems: 'center', gap: 6, backgroundColor: COLORS.glass },
  intensityBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  intensityBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  intensityBtnTextActive: { color: COLORS.accent },
  speedBtnActive: { borderColor: COLORS.gold, backgroundColor: COLORS.goldDim },
  speedBtnTextActive: { color: COLORS.gold },
  intensityDots: { flexDirection: 'row', gap: 4 },
  intensityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  intensityDotActive: { backgroundColor: COLORS.accent },
  speedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  speedDotActive: { backgroundColor: COLORS.gold },
});
