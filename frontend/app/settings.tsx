import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Haptics from 'expo-haptics';
import { useApp } from '../contexts/AppContext';
import { getTranslation, LANGUAGES } from '../constants/translations';
import { COLORS } from '../constants/colors';
import { INSTAGRAM_URL, WEBSITE_URL, EMAIL } from '../constants/radioStations';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage } = useApp();
  const t = getTranslation(language);
  const [showLangs, setShowLangs] = useState(false);

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Error', 'Cannot open URL: ' + url);
    }
  };

  const openEmail = async () => {
    try {
      await Linking.openURL(`mailto:${EMAIL}?subject=Rare Shot App Feedback`);
    } catch {
      Alert.alert('Email', EMAIL);
    }
  };

  const openLiveWallpaperSettings = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(t.liveWallpaper, 'Available on Android only');
      return;
    }
    try {
      await IntentLauncher.startActivityAsync('android.intent.action.SET_WALLPAPER');
    } catch (e) {
      Alert.alert(t.liveWallpaper, 'Go to Settings > Wallpaper > Live Wallpapers > Rare Shot');
    }
  };

  const openAccessibilitySettings = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(t.accessibility, 'Available on Android only');
      return;
    }
    try {
      await IntentLauncher.startActivityAsync('android.settings.ACCESSIBILITY_SETTINGS');
    } catch {
      Alert.alert(t.enableAccessibility, t.enableInSettings);
    }
  };

  const currentLangInfo = LANGUAGES.find(l => l.code === language);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#010f05', '#041a0a', '#020d06']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <LinearGradient colors={['rgba(21,128,61,0.9)', 'rgba(5,46,22,1)']} style={styles.logoGrad}>
                <Text style={styles.logoEmoji}>🌿</Text>
                <Text style={styles.logoStars}>✦</Text>
                <Text style={styles.logoCam}>◎</Text>
              </LinearGradient>
            </View>
            <Text style={styles.appTitle}>RARE SHOT</Text>
            <Text style={styles.appSubtitle}>{t.appSubtitle}</Text>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.language}</Text>
          <TouchableOpacity
            testID="language-selector"
            onPress={() => { setShowLangs(!showLangs); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={styles.row}
          >
            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
              <View style={styles.rowInner}>
                <Text style={styles.rowEmoji}>{currentLangInfo?.flag}</Text>
                <Text style={styles.rowLabel}>{currentLangInfo?.native} ({currentLangInfo?.name})</Text>
                <Ionicons name={showLangs ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
              </View>
            </BlurView>
          </TouchableOpacity>

          {showLangs && (
            <BlurView intensity={15} tint="dark" style={styles.langList}>
              <View style={styles.langListInner}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    testID={`lang-${lang.code}`}
                    key={lang.code}
                    onPress={() => {
                      setLanguage(lang.code);
                      setShowLangs(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    style={[styles.langRow, language === lang.code && styles.langRowActive]}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langName, language === lang.code && styles.langNameActive]}>{lang.native}</Text>
                    <Text style={styles.langNameEn}>{lang.name}</Text>
                    {language === lang.code && <Ionicons name="checkmark" size={16} color={COLORS.accent} />}
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          )}
        </View>

        {/* Home Screen Widgets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Виджеты на главном экране</Text>
          <Text style={[styles.sectionTitle, { fontSize: 11, color: COLORS.textMuted, marginTop: -6, fontWeight: '400' }]}>
            Долгое нажатие на рабочем столе → «Виджеты» → «Rare Shot»
          </Text>
          <View style={styles.widgetSection}>
            {[
              { icon: '🎵', title: 'Музыкальный виджет (4×1)', desc: 'Управление радиостанцией + Play/Pause/Next' },
              { icon: '🖼', title: 'Виджет обоев (2×2)', desc: 'Превью текущих обоев + кнопка смены' },
              { icon: '✨', title: 'Виджет эффектов (2×1)', desc: 'Переключение частиц: дождь / снег / листья' },
            ].map((w, i) => (
              <View key={i} style={styles.widgetCard}>
                <BlurView intensity={12} tint="dark" style={styles.widgetCardBlur}>
                  <View style={styles.widgetCardRow}>
                    <View style={styles.widgetCardIcon}>
                      <Text style={{ fontSize: 20 }}>{w.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.widgetCardTitle}>{w.title}</Text>
                      <Text style={styles.widgetCardDesc}>{w.desc}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
                  </View>
                </BlurView>
              </View>
            ))}
          </View>
        </View>

        {/* Social Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.social}</Text>

          <TouchableOpacity testID="instagram-btn" onPress={() => openUrl(INSTAGRAM_URL)} style={styles.row}>
            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
              <LinearGradient colors={['rgba(131,58,180,0.2)', 'rgba(253,29,29,0.2)', 'rgba(252,176,69,0.2)']} style={styles.rowInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={{ fontSize: 22 }}>📸</Text>
                <View style={styles.rowTextArea}>
                  <Text style={styles.rowLabel}>Instagram</Text>
                  <Text style={styles.rowDesc}>{t.instagram}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
              </LinearGradient>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity testID="email-btn" onPress={openEmail} style={styles.row}>
            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
              <View style={styles.rowInner}>
                <Text style={{ fontSize: 22 }}>✉️</Text>
                <View style={styles.rowTextArea}>
                  <Text style={styles.rowLabel}>{EMAIL}</Text>
                  <Text style={styles.rowDesc}>{t.feedback}</Text>
                </View>
                <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} />
              </View>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity testID="website-btn" onPress={() => openUrl(WEBSITE_URL)} style={styles.row}>
            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
              <View style={styles.rowInner}>
                <Text style={{ fontSize: 22 }}>🌐</Text>
                <View style={styles.rowTextArea}>
                  <Text style={styles.rowLabel}>NINSET8.wixsite.com/rare</Text>
                  <Text style={styles.rowDesc}>{t.website}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Permissions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.permissions}</Text>

          <TouchableOpacity testID="live-wallpaper-btn" onPress={openLiveWallpaperSettings} style={styles.row}>
            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
              <View style={styles.rowInner}>
                <Text style={{ fontSize: 22 }}>🖼</Text>
                <View style={styles.rowTextArea}>
                  <Text style={styles.rowLabel}>{t.liveWallpaper}</Text>
                  <Text style={styles.rowDesc}>Android Settings → Wallpaper → Live</Text>
                </View>
                <Ionicons name="settings-outline" size={16} color={COLORS.accent} />
              </View>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity testID="accessibility-btn" onPress={openAccessibilitySettings} style={styles.row}>
            <BlurView intensity={15} tint="dark" style={styles.rowBlur}>
              <View style={styles.rowInner}>
                <Text style={{ fontSize: 22 }}>♿</Text>
                <View style={styles.rowTextArea}>
                  <Text style={styles.rowLabel}>{t.accessibility}</Text>
                  <Text style={styles.rowDesc}>{t.doubleTapInfo}</Text>
                </View>
                <Ionicons name="settings-outline" size={16} color={COLORS.accent} />
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* About */}
        <BlurView intensity={15} tint="dark" style={styles.aboutCard}>
          <View style={styles.aboutCardInner}>
            <Text style={styles.aboutTitle}>Rare Shot Live Wallpaper</Text>
            <Text style={styles.aboutVersion}>{t.version} 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              Живые обои с природными пейзажами, расслабляющей музыкой и эффектами частиц для вашего Android устройства.
            </Text>
            <Text style={styles.aboutCopy}>© 2025 konon_photographer · All rights reserved</Text>
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  backBtn: { position: 'absolute', left: 0, top: 0, padding: 8 },
  logoSection: { alignItems: 'center', marginTop: 8 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.borderGreen, marginBottom: 12 },
  logoGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 26 },
  logoStars: { fontSize: 8, color: COLORS.gold, letterSpacing: 3 },
  logoCam: { fontSize: 16, color: COLORS.accent },
  appTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: 5, textShadowColor: COLORS.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  appSubtitle: { color: COLORS.textSecondary, fontSize: 12, letterSpacing: 3, marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 },
  row: { marginBottom: 8, borderRadius: 16, overflow: 'hidden' },
  rowBlur: { borderRadius: 16, overflow: 'hidden' },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14 },
  rowEmoji: { fontSize: 22 },
  rowLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  rowTextArea: { flex: 1 },
  rowDesc: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  langList: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  langListInner: { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: 'hidden' },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.separator },
  langRowActive: { backgroundColor: COLORS.accentDim },
  langFlag: { fontSize: 20 },
  langName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', flex: 1 },
  langNameActive: { color: COLORS.accent },
  langNameEn: { color: COLORS.textMuted, fontSize: 12 },
  apkBtn: { borderRadius: 16, overflow: 'hidden' },
  apkGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16 },
  apkText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  widgetSection: { gap: 8 },
  widgetCard: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  widgetCardBlur: { padding: 14 },
  widgetCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  widgetCardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(74,222,128,0.12)', alignItems: 'center', justifyContent: 'center' },
  widgetCardTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  widgetCardDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  aboutCard: { borderRadius: 20, overflow: 'hidden' },
  aboutCardInner: { backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 20, alignItems: 'center' },
  aboutTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  aboutVersion: { color: COLORS.accent, fontSize: 12, fontWeight: '600', marginBottom: 12 },
  aboutDesc: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 12 },
  aboutCopy: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center' },
});
