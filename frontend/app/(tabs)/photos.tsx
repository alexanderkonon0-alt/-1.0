import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Dimensions, ActivityIndicator, Switch, Modal, TextInput, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp, WallpaperItem } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { GOOGLE_PHOTOS_URL } from '../../constants/radioStations';
import { setWallpaperUri, launchWallpaperPicker, isWallpaperModuleAvailable } from '../../modules/wallpaper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SW } = Dimensions.get('window');
const COLS = 3;
const THUMB_SIZE = (SW - 4) / COLS;

const INTERVALS = [
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();
  const {
    wallpapers, addWallpaper, removeWallpaper, setCurrentWallpaper, currentWallpaper,
    autoChange, setAutoChange, autoChangeInterval, setAutoChangeInterval, language,
  } = useApp();
  const t = getTranslation(language);

  const [gPhotos, setGPhotos] = useState<{ url: string; thumbnail: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [albumUrl, setAlbumUrl] = useState(GOOGLE_PHOTOS_URL);
  const [editingUrl, setEditingUrl] = useState(false);
  const [editUrlText, setEditUrlText] = useState(GOOGLE_PHOTOS_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [settingLive, setSettingLive] = useState(false);

  const handleSetLiveWallpaper = useCallback(async (uri: string) => {
    if (Platform.OS !== 'android') {
      Alert.alert(t.liveWallpaper, 'Live wallpapers available only on Android APK build.');
      return;
    }
    if (!isWallpaperModuleAvailable()) {
      Alert.alert(t.liveWallpaper, 'Native module not found. Use APK build.');
      return;
    }
    try {
      setSettingLive(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await setWallpaperUri(uri);
      await launchWallpaperPicker();
    } catch (e: any) {
      Alert.alert(t.error, e?.message || '');
    } finally {
      setSettingLive(false);
    }
  }, [t]);

  const fetchPhotos = useCallback(async (url: string) => {
    setLoading(true);
    setGPhotos([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/google-photos?album_url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setGPhotos(data);
      } else {
        Alert.alert(t.error, 'Could not load album.');
      }
    } catch {
      Alert.alert(t.error, 'No server connection.');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchPhotos(albumUrl); }, []);

  const addAsWallpaper = useCallback(async (photo: { url: string; thumbnail: string; name: string }) => {
    const already = wallpapers.some(w => w.uri === photo.url);
    if (already) {
      setCurrentWallpaper(wallpapers.find(w => w.uri === photo.url)!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const item: WallpaperItem = {
      id: `gp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      uri: photo.url, type: 'photo', name: photo.name,
    };
    await addWallpaper(item);
    setCurrentWallpaper(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [wallpapers, addWallpaper, setCurrentWallpaper]);

  const addAllWallpapers = useCallback(async () => {
    Alert.alert(t.selectAll, `${t.add} ${gPhotos.length} ${t.photos}?`, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.add,
        onPress: async () => {
          for (const p of gPhotos) {
            if (!wallpapers.some(w => w.uri === p.url)) {
              await addWallpaper({ id: `gp_${Date.now()}_${Math.random().toString(36).slice(2)}`, uri: p.url, type: 'photo', name: p.name });
            }
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }, [gPhotos, wallpapers, addWallpaper, t]);

  const renderItem = useCallback(({ item }: { item: typeof gPhotos[0] }) => {
    const isActive = currentWallpaper?.uri === item.url;
    return (
      <TouchableOpacity
        style={[styles.thumb, isActive && styles.thumbActive]}
        onPress={() => addAsWallpaper(item)}
        onLongPress={() => setPreview(item)}
        activeOpacity={0.82}
      >
        <Image source={{ uri: item.thumbnail }} style={styles.thumbImg} contentFit="cover" />
        {isActive && (
          <View style={styles.activeOverlay}>
            <Ionicons name="checkmark-circle" size={28} color={COLORS.accent} />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [currentWallpaper, addAsWallpaper]);

  const confirmUrl = useCallback(() => {
    setAlbumUrl(editUrlText); setEditingUrl(false); fetchPhotos(editUrlText);
  }, [editUrlText, fetchPhotos]);

  const formatInterval = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    return `${Math.floor(sec / 3600)}h`;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{'\u{1F4F7}'} Google Photos</Text>
          <Text style={styles.headerSub}>{gPhotos.length > 0 ? `${gPhotos.length} ${t.photos}` : t.loading}</Text>
        </View>
        <View style={styles.headerActions}>
          {gPhotos.length > 0 && (
            <TouchableOpacity style={styles.iconBtn} onPress={addAllWallpapers}>
              <BlurView intensity={14} tint="dark" style={styles.iconBtnBlur}>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.accent} />
              </BlurView>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => fetchPhotos(albumUrl)}>
            <BlurView intensity={14} tint="dark" style={styles.iconBtnBlur}>
              <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            </BlurView>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettings(true)}>
            <BlurView intensity={14} tint="dark" style={styles.iconBtnBlur}>
              <Ionicons name="options-outline" size={20} color={COLORS.textSecondary} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.urlBar} onPress={() => { setEditUrlText(albumUrl); setEditingUrl(true); }}>
        <BlurView intensity={12} tint="dark" style={styles.urlBarBlur}>
          <Ionicons name="link-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.urlBarText} numberOfLines={1}>{albumUrl}</Text>
          <Ionicons name="pencil-outline" size={14} color={COLORS.textMuted} />
        </BlurView>
      </TouchableOpacity>

      {/* Auto-change bar */}
      <View style={styles.autoBar}>
        <View style={styles.autoBarLeft}>
          <Ionicons name="timer-outline" size={16} color={autoChange ? COLORS.accent : COLORS.textMuted} />
          <Text style={[styles.autoBarText, autoChange && { color: COLORS.accent }]}>{t.autoChange}</Text>
          <Switch
            value={autoChange}
            onValueChange={setAutoChange}
            trackColor={{ false: COLORS.glass, true: COLORS.accentDim }}
            thumbColor={autoChange ? COLORS.accent : COLORS.textMuted}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>
        {autoChange && (
          <View style={styles.autoBarIntervals}>
            {INTERVALS.map(iv => (
              <TouchableOpacity
                key={iv.value}
                style={[styles.miniPill, autoChangeInterval === iv.value && styles.miniPillActive]}
                onPress={() => { setAutoChangeInterval(iv.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.miniPillText, autoChangeInterval === iv.value && styles.miniPillTextActive]}>
                  {iv.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>{t.loading}</Text>
        </View>
      )}

      {!loading && (
        <FlatList
          data={gPhotos}
          keyExtractor={p => p.url}
          numColumns={COLS}
          renderItem={renderItem}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>{'\u{1F4F7}'}</Text>
              <Text style={styles.emptyText}>{t.noWallpapers}</Text>
            </View>
          }
        />
      )}

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <View style={[styles.settingsBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>{'\u2699\uFE0F'} {t.settings}</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>{t.autoChange}</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>{t.autoChange}</Text>
                <Switch
                  value={autoChange}
                  onValueChange={setAutoChange}
                  trackColor={{ false: COLORS.glass, true: COLORS.accentDim }}
                  thumbColor={autoChange ? COLORS.accent : COLORS.textMuted}
                />
              </View>
              {autoChange && (
                <>
                  <Text style={styles.intervalLabel}>{t.interval}: {formatInterval(autoChangeInterval)}</Text>
                  <View style={styles.intervalRow}>
                    {INTERVALS.map(iv => (
                      <TouchableOpacity
                        key={iv.value}
                        style={[styles.intervalBtn, autoChangeInterval === iv.value && styles.intervalBtnActive]}
                        onPress={() => { setAutoChangeInterval(iv.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      >
                        <Text style={[styles.intervalBtnText, autoChangeInterval === iv.value && styles.intervalBtnTextActive]}>
                          {iv.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.settingsHint}>{t.cyclic}</Text>
                </>
              )}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>{t.currentWallpaper} ({wallpapers.filter(w => w.type === 'photo').length})</Text>
              <FlatList
                data={wallpapers.filter(w => w.type === 'photo')}
                keyExtractor={w => w.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.myWallThumb}>
                    <Image source={{ uri: item.uri }} style={styles.myWallImg} contentFit="cover" />
                    {currentWallpaper?.id === item.id && (
                      <View style={styles.myWallActive}>
                        <Ionicons name="checkmark" size={12} color="#000" />
                      </View>
                    )}
                    <TouchableOpacity style={styles.myWallDelete} onPress={() => removeWallpaper(item.id)}>
                      <Ionicons name="trash-outline" size={12} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.settingsLabel}>{t.noWallpapers}</Text>}
              />
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* URL edit modal */}
      <Modal visible={editingUrl} transparent animationType="fade" onRequestClose={() => setEditingUrl(false)}>
        <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
          <View style={[styles.urlEditBox, { marginBottom: insets.bottom + 20 }]}>
            <Text style={styles.urlEditTitle}>Google Photos URL</Text>
            <TextInput
              style={styles.urlEditInput} value={editUrlText}
              onChangeText={setEditUrlText} placeholder="https://photos.app.goo.gl/..."
              placeholderTextColor={COLORS.textMuted} autoCapitalize="none" keyboardType="url" autoFocus
            />
            <View style={styles.urlEditBtns}>
              <TouchableOpacity style={styles.urlEditCancel} onPress={() => setEditingUrl(false)}>
                <Text style={styles.urlEditCancelText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.urlEditConfirm} onPress={confirmUrl}>
                <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.urlEditConfirmGrad}>
                  <Text style={styles.urlEditConfirmText}>{t.add}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Preview modal */}
      {preview && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreview(null)}>
          <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
            <Image source={{ uri: preview.url }} style={styles.previewImg} contentFit="contain" />
            <BlurView intensity={20} tint="dark" style={styles.previewBar}>
              <Text style={styles.previewName}>{preview.name}</Text>
              <View style={styles.previewBtns}>
                {Platform.OS === 'android' && (
                  <TouchableOpacity style={[styles.previewSetBtn, { flex: 1 }]} onPress={() => { handleSetLiveWallpaper(preview.url); setPreview(null); }}>
                    <LinearGradient colors={['#4ade80', '#16a34a']} style={styles.previewSetGrad}>
                      <Ionicons name="phone-portrait" size={16} color="#000" />
                      <Text style={[styles.previewSetText, { color: '#000' }]}>{t.setAsWallpaper}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.previewSetBtn, { flex: 1 }]} onPress={() => { addAsWallpaper(preview); setPreview(null); }}>
                  <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.previewSetGrad}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
                    <Text style={styles.previewSetText}>{t.add}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerLeft: { flex: 1 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  iconBtnBlur: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,15,8,0.55)', borderWidth: 1, borderColor: COLORS.border },
  urlBar: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  urlBarBlur: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,15,8,0.45)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  urlBarText: { flex: 1, color: COLORS.textMuted, fontSize: 11 },
  autoBar: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.glass, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 10 },
  autoBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoBarText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', flex: 1 },
  autoBarIntervals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  miniPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.border },
  miniPillActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.borderGreen },
  miniPillText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  miniPillTextActive: { color: COLORS.accent },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  grid: { paddingHorizontal: 2, paddingTop: 2 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, margin: 1, overflow: 'hidden' },
  thumbActive: { borderWidth: 2.5, borderColor: COLORS.accent },
  thumbImg: { width: '100%', height: '100%' },
  activeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(74,222,128,0.22)', alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  settingsBox: { backgroundColor: 'rgba(3,14,8,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 20, borderTopWidth: 1, borderColor: COLORS.border, maxHeight: '80%' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  settingsSection: { marginBottom: 20 },
  settingsSectionTitle: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  settingsLabel: { color: COLORS.textSecondary, fontSize: 14 },
  settingsHint: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  intervalLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 8, marginBottom: 6 },
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intervalBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border },
  intervalBtnActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.borderGreen },
  intervalBtnText: { color: COLORS.textMuted, fontSize: 13 },
  intervalBtnTextActive: { color: COLORS.accent, fontWeight: '700' },
  myWallThumb: { width: 72, height: 72, marginRight: 8, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  myWallImg: { width: '100%', height: '100%' },
  myWallActive: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  myWallDelete: { position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 4 },
  urlEditBox: { backgroundColor: 'rgba(5,20,10,0.98)', marginHorizontal: 20, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  urlEditTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  urlEditInput: { backgroundColor: COLORS.glass, borderRadius: 12, padding: 12, color: COLORS.textPrimary, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  urlEditBtns: { flexDirection: 'row', gap: 10 },
  urlEditCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  urlEditCancelText: { color: COLORS.textMuted, fontSize: 14 },
  urlEditConfirm: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  urlEditConfirmGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  urlEditConfirmText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  previewOverlay: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: SW, height: SW * 1.6 },
  previewBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  previewName: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 12 },
  previewBtns: { flexDirection: 'row', gap: 10 },
  previewSetBtn: { borderRadius: 14, overflow: 'hidden' },
  previewSetGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  previewSetText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
