import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useApp } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';

export default function TabsLayout() {
  const { language } = useApp();
  const t = getTranslation(language);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.tabBarBg} />
          </BlurView>
        ),
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: styles.tabIcon,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'leaf' : 'leaf-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: t.photos,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'images' : 'images-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: t.videos,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'film' : 'film-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: t.music,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'radio' : 'radio-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="effects"
        options={{
          title: t.effects,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'transparent',
    elevation: 0,
    height: Platform.OS === 'android' ? 70 : 85,
    paddingBottom: Platform.OS === 'android' ? 10 : 25,
  },
  tabBarBg: {
    flex: 1,
    backgroundColor: COLORS.tabBar,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabIcon: {
    marginTop: 2,
  },
});
