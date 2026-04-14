import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  Modal, TextInput, Dimensions, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useApp, WallpaperItem } from '../../contexts/AppContext';
import { getTranslation } from '../../constants/translations';
import { COLORS } from '../../constants/colors';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;

export default function VideosScreen() {
  const insets = useSafeAreaInsets();
  const { wallpapers, addWallpaper, removeWallpaper, setCurrentWallpaper, currentWallpaper, language } = useApp();
  const t = getTranslation(language);

  const videoWallpapers = wallpapers.filter(w => w.type === 'video');
  const allVideos = videoWallpapers;
  const [urlModal, setUrlModal] = useState(false);
  const [urlText, setUrlText] = useState('');
  const [adding, setAdding] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<WallpaperItem | null>(null);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const id = `user_vid_${Date.now()}`;
        await addWallpaper({ id, uri: asset.uri, type: 'video', name: asset.name || 'Video' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  }, [addWallpaper]);

  const addFromUrl = useCallback(async () => {
    if (!urlText.trim()) return;
    setAdding(true);
    const id = `url_vid_${Date.now()}`;
    await addWallpaper({ id, uri: urlText.trim(), type: 'video', name: 'Video from URL' });
    setUrlText('');
    setUrlModal(false);
    setAdding(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [urlText, addWallpaper]);

  const handleDelete = useCallback((item: WallpaperItem) => {
    if (item.isBuiltIn) return;
    Alert.alert(t.delete, item.name, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => removeWallpaper(item.id) }
    ]);
  }, [removeWallpaper, t]);

  const renderItem = ({ item }: { item: WallpaperItem }) => {
    const isActive = currentWallpaper?.id === item.id;
    const thumb = item.thumbnailUri || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=400&q=60';
    return (
      <TouchableOpacity
        testID={`video-card-${item.id}`}
        style={[styles.card, isActive && styles.cardActive]}
        onPress={() => setCurrentWallpaper(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.85}
      >
        <Image source={{ uri: thumb }} style={styles.cardImg} contentFit="cover" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.cardGrad}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        </LinearGradient>
        {/* Play icon */}
        <View style={styles.playOverlay}>
          <View style={styles.playCircle}>
            <Ionicons name="play" size={20} color={COLORS.white} />
          </View>
        </View>
        {isActive && (
          <View style={styles.activeIndicator}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
          </View>
        )}
        <View style={styles.cardActions}>
          <TouchableOpacity testID={`preview-video-${item.id}`} onPress={() => setPreviewVideo(item)} style={styles.actionBtn}>
            <Ionicons name="expand-outline" size={14} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#010f05', '#041a0a', '#031209']} style={StyleSheet.absoluteFill} />

      <FlatList
        data={allVideos}
        keyExtractor={i => i.id}
        numColumns={2}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 160 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>🎬 {t.videos}</Text>
            <BlurView intensity={20} tint="dark" style={styles.infoCard}>
              <View style={styles.infoCardInner}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.accent} />
                <Text style={styles.infoText}>
                  {Platform.OS === 'android'
                    ? 'Видео воспроизводится как фоновые обои в приложении. Для установки на рабочий стол используйте настройки Live Wallpaper.'
                    : 'Video wallpapers play within the app. Set as device wallpaper from Android settings.'}
                </Text>
              </View>
            </BlurView>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{t.noVideos}</Text>}
        columnWrapperStyle={styles.row}
      />

      {/* FAB actions */}
      <View style={[styles.fab, { bottom: insets.bottom + 68 }]}>
        <TouchableOpacity testID="add-video-url-btn" onPress={() => setUrlModal(true)} style={styles.fabBtn}>
          <BlurView intensity={25} tint="dark" style={styles.fabBlur}>
            <View style={[styles.fabInner]}>
              <Ionicons name="link-outline" size={18} color={COLORS.accent} />
              <Text style={styles.fabLabel}>{t.fromUrl}</Text>
            </View>
          </BlurView>
        </TouchableOpacity>
        <TouchableOpacity testID="add-video-gallery-btn" onPress={pickFromGallery} style={styles.fabBtnPrimary}>
          <LinearGradient colors={[COLORS.primaryLight, COLORS.primary]} style={styles.fabGrad}>
            <Ionicons name="add" size={22} color={COLORS.white} />
            <Text style={styles.fabLabelWhite}>{t.fromGallery}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Preview Modal */}
      <Modal visible={!!previewVideo} transparent animationType="fade" onRequestClose={() => setPreviewVideo(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setPreviewVideo(null)} />
          <BlurView intensity={60} tint="dark" style={styles.previewBox}>
            <View style={styles.previewBoxInner}>
              <Text style={styles.previewTitle} numberOfLines={1}>{previewVideo?.name}</Text>
              <View style={styles.previewThumb}>
                <Image source={{ uri: previewVideo?.thumbnailUri || previewVideo?.uri }} style={styles.previewImg} contentFit="cover" />
                <View style={styles.playOverlayLarge}>
                  <View style={styles.playCircleLarge}>
                    <Ionicons name="play" size={36} color={COLORS.white} />
                  </View>
                </View>
              </View>
              <Text style={styles.previewUri} numberOfLines={2}>{previewVideo?.uri}</Text>
              <TouchableOpacity testID="close-preview-btn" onPress={() => setPreviewVideo(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* URL Modal */}
      <Modal visible={urlModal} transparent animationType="slide" onRequestClose={() => setUrlModal(false)}>
        <BlurView intensity={40} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t.urlVideo}</Text>
            <TextInput
              testID="video-url-input"
              style={styles.urlInput}
              value={urlText}
              onChangeText={setUrlText}
              placeholder={t.enterVideoUrl}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity testID="cancel-video-url-btn" style={styles.cancelBtn} onPress={() => setUrlModal(false)}>
                <Text style={styles.cancelBtnText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="add-video-confirm-btn" style={styles.addBtn} onPress={addFromUrl}>
                <Text style={styles.addBtnText}>{adding ? t.loading : t.add}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { paddingHorizontal: 16, gap: 12 },
  row: { gap: 12 },
  header: { marginBottom: 16 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', marginBottom: 12 },
  infoCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 4 },
  infoCardInner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 },
  infoText: { color: COLORS.textMuted, fontSize: 12, flex: 1, lineHeight: 18 },
  card: { width: CARD_W, height: 180, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  cardActive: { borderWidth: 2, borderColor: COLORS.accent },
  cardImg: { width: '100%', height: '100%' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  cardName: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircle: { backgroundColor: 'rgba(0,0,0,0.5)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  activeIndicator: { position: 'absolute', top: 8, right: 8 },
  cardActions: { position: 'absolute', top: 8, left: 8 },
  actionBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 10 },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  fab: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
  fabBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  fabBlur: { borderRadius: 14, overflow: 'hidden' },
  fabInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 10, backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14 },
  fabLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  fabBtnPrimary: { flex: 1.2, borderRadius: 14, overflow: 'hidden' },
  fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14 },
  fabLabelWhite: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  previewOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  previewBox: { borderRadius: 24, overflow: 'hidden', width: '100%' },
  previewBoxInner: { backgroundColor: COLORS.glass, padding: 20, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24 },
  previewTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  previewThumb: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  previewImg: { width: '100%', height: '100%' },
  playOverlayLarge: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playCircleLarge: { backgroundColor: 'rgba(0,0,0,0.6)', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  previewUri: { color: COLORS.textMuted, fontSize: 11, marginBottom: 16, textAlign: 'center' },
  closeBtn: { backgroundColor: COLORS.surfaceLight, padding: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  closeBtnText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBox: { backgroundColor: 'rgba(5,20,12,0.97)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  urlInput: { backgroundColor: COLORS.surfaceLight, borderRadius: 14, padding: 14, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  addBtn: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center' },
  addBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
