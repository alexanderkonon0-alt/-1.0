import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, FadeIn, FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SW, height: SH } = Dimensions.get('window');

interface ScreenDimOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export const ScreenDimOverlay: React.FC<ScreenDimOverlayProps> = ({ visible, onDismiss }) => {
  const opacity = useSharedValue(visible ? 1 : 0);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={handleDismiss}
        activeOpacity={1}
      >
        <View style={styles.content}>
          {/* Lock icon */}
          <View style={styles.iconCircle}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          {/* Time display */}
          <ClockDisplay />

          {/* Hint */}
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>Нажмите для разблокировки</Text>
            <Text style={styles.hintSubText}>Tap to unlock</Text>
          </View>

          {/* Swipe up indicator */}
          <View style={styles.swipeBar} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ClockDisplay = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.clockContainer}>
      <Text style={styles.clockTime}>{timeStr}</Text>
      <Text style={styles.clockDate}>{dateStr}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SW,
    height: SH,
    backgroundColor: '#000000',
    zIndex: 9999,
    elevation: 99,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 38,
  },
  clockContainer: {
    alignItems: 'center',
  },
  clockTime: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: '100',
    letterSpacing: 2,
  },
  clockDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  hintContainer: {
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  hintSubText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  swipeBar: {
    position: 'absolute',
    bottom: 40,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
