import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppProvider, useApp } from '../contexts/AppContext';
import { ParticleSystem } from '../components/ParticleSystem';
import { VolumeWidget } from '../components/VolumeWidget';
import { COLORS } from '../constants/colors';

function AppShell() {
  const { activeEffect, effectIntensity, effectSpeed } = useApp();
  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
      <ParticleSystem type={activeEffect} intensity={effectIntensity} speed={effectSpeed} />
      <VolumeWidget />
      <StatusBar style="light" translucent backgroundColor="transparent" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
