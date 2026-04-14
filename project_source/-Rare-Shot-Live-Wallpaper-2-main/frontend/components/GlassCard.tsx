import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  radius?: number;
  borderColor?: string;
  noBlur?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 25,
  radius = 20,
  borderColor,
  noBlur = false,
}) => {
  if (noBlur) {
    return (
      <View style={[styles.fallback, { borderRadius: radius, borderColor: borderColor || COLORS.border }, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      style={[{ borderRadius: radius, overflow: 'hidden' }, style]}
    >
      <View style={[
        styles.inner,
        {
          borderRadius: radius,
          borderColor: borderColor || COLORS.border,
        }
      ]}>
        {children}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
  },
  fallback: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
