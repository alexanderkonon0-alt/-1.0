import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Dimensions, ActivityIndicator, Switch, Modal, TextInput, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { useApp, WallpaperItem } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';
import { GOOGLE_PHOTOS_URL } from '../../constants/radioStations';
import { setWallpaperUri, launchWallpaperPicker, isWallpaperModuleAvailable } from '../../modules/wallpaper';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width: SW } = Dimensions.get('window');

// 3 columns for photo grid — full-width usage
const COLS = 3;
const THUMB_SIZE = (SW - 4) / COLS;

// ─── Auto-change intervals ──────────────────────────────────────────────────
const INTERVALS = [
  { label: '30 сек', value: 30 },
  { label: '1 мин',  value: 60 },
  { label: '5 мин',  value: 300 },
  { label: '15 мин', value: 900 },
  { label: '1 час',  value: 3600 },
];

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();
  const {
    wallpapers, addWallpaper, removeWallpaper, setCurrentWallpaper, currentWallpaper,
    autoChange, setAutoChange, autoChangeInterval, setAutoChangeInterval, language,
  } = useApp();
  const t = getTranslation(language);

  // ─── Google Photos state ───────────────────────────────────────────────
  const [gPhotos, setGPhotos]         = useState<{ url: string; thumbnail: string; name: string }[]>([]);
  const [loading, setLoading]         = useState(false);
  const [albumUrl, setAlbumUrl]       = useState(GOOGLE_PHOTOS_URL);
  const [editingUrl, setEditingUrl]   = useState(false);
  const [editUrlText, setEditUrlText] = useState(GOOGLE_PHOTOS_URL);

  // ─── Settings panel ────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);

  // ─── Preview modal ─────────────────────────────────────────────────────
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  // ─── Permissions ───────────────────────────────────────────────────────
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  // ─── Set as live wallpaper ──────────────────────────────────────────────
  const [settingLive, setSettingLive] = useState(false);

  const handleSetLiveWallpaper = useCallback(async (uri: string) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Только Android', 'Живые обои поддерживаются только на Android.');
      return;
    }
    if (!isWallpaperModuleAvailable()) {
      Alert.alert(
        'Функция недоступна',
        'Нативный модуль не найден. Убедитесь, что вы используете APK-сборку, а не Expo Go.'
      );
      return;
    }
    try {
      setSettingLive(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Save photo URL so the wallpaper service knows what to display
      await setWallpaperUri(uri);
      // Open Android live wallpaper preview for our service
      await launchWallpaperPicker();
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message || 'Не удалось открыть настройки обоев.');
    } finally {
      setSettingLive(false);
    }
  }, []);

  // ─── Load Google Photos on mount ───────────────────────────────────────
  const fetchPhotos = useCallback(async (url: string) => {
    setLoading(true);
    setGPhotos([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/google-photos?album_url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        setGPhotos(data);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить альбом. Проверьте ссылку.');
      }
    } catch {
      Alert.alert('Ошибка', 'Нет соединения с сервером.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos(albumUrl);
  }, []);

  // ─── Add single photo as wallpaper ─────────────────────────────────────
  const addAsWallpaper = useCallback(async (photo: { url: string; thumbnail: string; name: string }) => {
    const already = wallpapers.some(w => w.uri === photo.url);
    if (already) {
      setCurrentWallpaper(wallpapers.find(w => w.uri === photo.url)!);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    const item: WallpaperItem = {
      id: `gp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      uri: photo.url,
      type: 'photo',
      name: photo.name,
    };
    await addWallpaper(item);
    setCurrentWallpaper(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [wallpapers, addWallpaper, setCurrentWallpaper]);

  // ─── Add all as wallpapers ──────────────────────────────────────────────
  const addAllWallpapers = useCallback(async () => {
    Alert.alert(
      'Добавить все?',
      `Добавить ${gPhotos.length} фото в коллекцию обоев?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Добавить',
          onPress: async () => {
            for (const p of gPhotos) {
              if (!wallpapers.some(w => w.uri === p.url)) {
                await addWallpaper({ id: `gp_${Date.now()}_${Math.random().toString(36).slice(2)}`, uri: p.url, type: 'photo', name: p.name });
              }
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }, [gPhotos, wallpapers, addWallpaper]);

  // ─── Pick from device gallery ───────────────────────────────────────────
  const pickFromGallery = useCallback(async () => {
    if (!mediaPermission?.granted) {
      const res = await requestMediaPermission();
      if (!res.granted) {
        Alert.alert('Нет доступа', 'Разрешите доступ к галерее в настройках телефона.');
        return;
      }
    }
    const assets = await MediaLibrary.getAssetsAsync({ mediaType: 'photo', first: 50, sortBy: 'creationTime' });
    if (assets.assets.length === 0) {
      Alert.alert('Галерея пуста', 'На устройстве нет фото.');
      return;
    }
    // Take the most recent photo
    const asset = assets.assets[0];
    const item: WallpaperItem = { id: `device_${asset.id}`, uri: asset.uri, type: 'photo', name: asset.filename || 'Фото' };
    await addWallpaper(item);
    setCurrentWallpaper(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [mediaPermission, requestMediaPermission, addWallpaper, setCurrentWallpaper]);

  // ─── Render photo item ──────────────────────────────────────────────────
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

  // ─── URL edit modal ──────────────────────────────────────────────────────
  const confirmUrl = useCallback(() => {
    setAlbumUrl(editUrlText);
    setEditingUrl(false);
    fetchPhotos(editUrlText);
  }, [editUrlText, fetchPhotos]);

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>📷 Google Photos</Text>
          <Text style={styles.headerSub}>{gPhotos.length > 0 ? `${gPhotos.length} фото` : 'Загрузка...'}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Add all button */}
          {gPhotos.length > 0 && (
            <TouchableOpacity style={styles.iconBtn} onPress={addAllWallpapers}>
              <BlurView intensity={14} tint="dark" style={styles.iconBtnBlur}>
                <Ionicons name="add-circle-outline" size={22} color={COLORS.accent} />
              </BlurView>
            </TouchableOpacity>
          )}
          {/* Refresh */}
          <TouchableOpacity style={styles.iconBtn} onPress={() => fetchPhotos(albumUrl)}>
            <BlurView intensity={14} tint="dark" style={styles.iconBtnBlur}>
              <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
            </BlurView>
          </TouchableOpacity>
          {/* Settings */}
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowSettings(true)}>
            <BlurView intensity={14} tint="dark" style={styles.iconBtnBlur}>
              <Ionicons name="options-outline" size={20} color={COLORS.textSecondary} />
            </BlurView>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Album URL bar ── */}
      <TouchableOpacity style={styles.urlBar} onPress={() => { setEditUrlText(albumUrl); setEditingUrl(true); }}>
        <BlurView intensity={12} tint="dark" style={styles.urlBarBlur}>
          <Ionicons name="link-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.urlBarText} numberOfLines={1}>{albumUrl}</Text>
          <Ionicons name="pencil-outline" size={14} color={COLORS.textMuted} />
        </BlurView>
      </TouchableOpacity>

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Загрузка Google Photos...</Text>
        </View>
      )}

      {/* ── Photo grid ── */}
      {!loading && (
        <FlatList
          data={gPhotos}
          keyExtractor={p => p.url}
          numColumns={COLS}
          renderItem={renderItem}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 140 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyText}>Альбом пуст или недоступен</Text>
              <Text style={styles.emptyHint}>Проверьте ссылку или доступность альбома</Text>
            </View>
          }
        />
      )}

      {/* ── Bottom toolbar ── */}
      <BlurView intensity={20} tint="dark" style={[styles.toolbar, { paddingBottom: insets.bottom + 68 }]}>
        <View style={styles.toolbarRow}>
          {/* Add from gallery */}
          <TouchableOpacity style={styles.toolBtn} onPress={pickFromGallery}>
            <LinearGradient colors={['rgba(74,222,128,0.18)', 'rgba(74,222,128,0.08)']} style={styles.toolBtnGrad}>
              <Ionicons name="images-outline" size={20} color={COLORS.accent} />
              <Text style={styles.toolBtnText}>Из галереи</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Set Live Wallpaper button - main CTA */}
          {currentWallpaper && Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.liveBtn}
              onPress={() => handleSetLiveWallpaper(currentWallpaper.uri)}
              disabled={settingLive}
            >
              <LinearGradient
                colors={['#4ade80', '#16a34a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.liveBtnGrad}
              >
                {settingLive
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Ionicons name="phone-portrait" size={18} color="#000" />
                }
                <Text style={styles.liveBtnText}>
                  {settingLive ? 'Открываем...' : 'Живые обои'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Auto-change toggle */}
          <View style={styles.autoBox}>
            <Ionicons name="timer-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.autoLabel}>Авто</Text>
            <Switch
              value={autoChange}
              onValueChange={setAutoChange}
              trackColor={{ false: COLORS.glass, true: COLORS.accentDim }}
              thumbColor={autoChange ? COLORS.accent : COLORS.textMuted}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
        </View>
      </BlurView>

      {/* ── Settings modal ── */}
      <Modal visible={showSettings} transparent animationType="slide" onRequestClose={() => setShowSettings(false)}>
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <View style={[styles.settingsBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>⚙️ Настройки обоев</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Auto-change section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Авто-смена обоев</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Включить авто-смену</Text>
                <Switch
                  value={autoChange}
                  onValueChange={setAutoChange}
                  trackColor={{ false: COLORS.glass, true: COLORS.accentDim }}
                  thumbColor={autoChange ? COLORS.accent : COLORS.textMuted}
                />
              </View>
              {autoChange && (
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
              )}
            </View>

            {/* My wallpapers section */}
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Мои обои ({wallpapers.filter(w => w.type === 'photo').length})</Text>
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
                    <TouchableOpacity
                      style={styles.myWallDelete}
                      onPress={() => removeWallpaper(item.id)}
                    >
                      <Ionicons name="trash-outline" size={12} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.settingsLabel}>Нет добавленных обоев</Text>}
              />
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ── URL edit modal ── */}
      <Modal visible={editingUrl} transparent animationType="fade" onRequestClose={() => setEditingUrl(false)}>
        <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
          <View style={[styles.urlEditBox, { marginBottom: insets.bottom + 20 }]}>
            <Text style={styles.urlEditTitle}>Ссылка на альбом Google Photos</Text>
            <TextInput
              style={styles.urlEditInput}
              value={editUrlText}
              onChangeText={setEditUrlText}
              placeholder="https://photos.app.goo.gl/..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType="url"
              autoFocus
            />
            <View style={styles.urlEditBtns}>
              <TouchableOpacity style={styles.urlEditCancel} onPress={() => setEditingUrl(false)}>
                <Text style={styles.urlEditCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.urlEditConfirm} onPress={confirmUrl}>
                <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.urlEditConfirmGrad}>
                  <Text style={styles.urlEditConfirmText}>Загрузить</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* ── Preview modal ── */}
      {preview && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreview(null)}>
          <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreview(null)}>
            <Image source={{ uri: preview.url }} style={styles.previewImg} contentFit="contain" />
            <BlurView intensity={20} tint="dark" style={styles.previewBar}>
              <Text style={styles.previewName}>{preview.name}</Text>
              <View style={styles.previewBtns}>
                {/* Set as Live Wallpaper - primary action */}
                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    style={[styles.previewSetBtn, { flex: 1 }]}
                    onPress={() => { handleSetLiveWallpaper(preview.url); setPreview(null); }}
                  >
                    <LinearGradient colors={['#4ade80', '#16a34a']} style={styles.previewSetGrad}>
                      <Ionicons name="phone-portrait" size={16} color="#000" />
                      <Text style={[styles.previewSetText, { color: '#000' }]}>Живые обои</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                {/* Add to collection */}
                <TouchableOpacity
                  style={[styles.previewSetBtn, { flex: 1 }]}
                  onPress={() => { addAsWallpaper(preview); setPreview(null); }}
                >
                  <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.previewSetGrad}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
                    <Text style={styles.previewSetText}>В коллекцию</Text>
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

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  headerLeft: { flex: 1 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  iconBtnBlur: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,15,8,0.55)', borderWidth: 1, borderColor: COLORS.border },

  // URL bar
  urlBar: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden' },
  urlBarBlur: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(0,15,8,0.45)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  urlBarText: { flex: 1, color: COLORS.textMuted, fontSize: 11 },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },

  // Grid
  grid: { paddingHorizontal: 2, paddingTop: 2 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, margin: 1, overflow: 'hidden' },
  thumbActive: { borderWidth: 2.5, borderColor: COLORS.accent },
  thumbImg: { width: '100%', height: '100%' },
  activeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(74,222,128,0.22)', alignItems: 'center', justifyContent: 'center' },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  // Toolbar
  toolbar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, gap: 12 },
  toolBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  toolBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderGreen },
  toolBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  autoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.glass, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  autoLabel: { color: COLORS.textSecondary, fontSize: 13 },

  // Settings modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  settingsBox: { backgroundColor: 'rgba(3,14,8,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 20, borderTopWidth: 1, borderColor: COLORS.border, maxHeight: '80%' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  settingsTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  settingsSection: { marginBottom: 20 },
  settingsSectionTitle: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  settingsLabel: { color: COLORS.textSecondary, fontSize: 14 },
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  intervalBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border },
  intervalBtnActive: { backgroundColor: COLORS.accentDim, borderColor: COLORS.borderGreen },
  intervalBtnText: { color: COLORS.textMuted, fontSize: 13 },
  intervalBtnTextActive: { color: COLORS.accent, fontWeight: '700' },
  myWallThumb: { width: 72, height: 72, marginRight: 8, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  myWallImg: { width: '100%', height: '100%' },
  myWallActive: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  myWallDelete: { position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 4 },

  // URL edit modal
  urlEditBox: { backgroundColor: 'rgba(5,20,10,0.98)', marginHorizontal: 20, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  urlEditTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
  urlEditInput: { backgroundColor: COLORS.glass, borderRadius: 12, padding: 12, color: COLORS.textPrimary, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  urlEditBtns: { flexDirection: 'row', gap: 10 },
  urlEditCancel: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  urlEditCancelText: { color: COLORS.textMuted, fontSize: 14 },
  urlEditConfirm: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  urlEditConfirmGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  urlEditConfirmText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  // Preview modal
  previewOverlay: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: SW, height: SW * 1.6 },
  previewBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 20, borderTopWidth: 1, borderTopColor: COLORS.border },
  previewName: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 12 },
  previewBtns: { flexDirection: 'row', gap: 10 },
  previewSetBtn: { borderRadius: 14, overflow: 'hidden' },
  previewSetGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  previewSetText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Live wallpaper button
  liveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  liveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14 },
  liveBtnText: { color: '#000', fontSize: 14, fontWeight: '800' },
});
