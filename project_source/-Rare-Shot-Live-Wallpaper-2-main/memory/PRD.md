# 📱 Rare Shot Live Wallpaper — PRD

## Project Overview
**App Name**: Rare Shot Live Wallpaper  
**Package**: com.rareshot.livewallpaper  
**Version**: 1.0.0  
**Platform**: Android (8+, API 26+)  
**Tech Stack**: React Native Expo SDK 54, FastAPI backend, MongoDB  

## Architecture
- **Frontend**: React Native Expo SDK 54 (managed workflow)
- **Navigation**: Expo Router (file-based)
- **State**: React Context (AppContext)
- **Audio**: expo-audio (radio streaming + local music)
- **Animations**: react-native-reanimated v3
- **Gestures**: react-native-gesture-handler
- **Storage**: @react-native-async-storage/async-storage
- **UI**: expo-blur (glassmorphism), expo-linear-gradient, expo-image
- **Files**: expo-document-picker, expo-media-library, expo-file-system
- **Backend**: FastAPI + httpx + beautifulsoup4 (Google Photos scraping)

## User Personas
- Photography enthusiasts who want their art as wallpaper
- Meditation/relaxation users who want ambient wallpapers + music
- Android customization enthusiasts
- Followers of @konon_photographer (Instagram)

## Core Requirements (Static)
1. Live photo and video wallpapers for home/lock screen
2. Background radio music (10 SomaFM nature/relaxation stations)
3. Particle effects overlay (rain, snow, leaves, sparkles, etc.)
4. Volume control widget (floating, gesture-based, collapsible)
5. Multi-language support (12 languages)
6. Dark green glassmorphism design
7. Social links (Instagram, email, website)
8. APK download from Google Drive

## Implemented Features ✅

### 2025-03 - v1.0.0 (Initial Build)

**Home Dashboard**
- Full-screen nature wallpaper display
- Time & date overlay (large elegant clock)
- Swipe left/right gesture to change wallpapers
- Arrow buttons for manual navigation
- App logo ("🌿 RARE SHOT") in top-left
- Settings gear button in top-right
- Current wallpaper name and active effect indicator
- Gesture info text at bottom

**Photo Wallpapers Screen**
- 8 built-in nature wallpapers from Unsplash
- 2-column grid with rounded thumbnail cards
- Tap to set as current wallpaper (with checkmark indicator)
- Long-press to delete user-added wallpapers
- "Set as Device Wallpaper" button (via expo-intent-launcher → Android WallpaperManager)
- Add from Gallery (DocumentPicker)
- Add from URL (modal with text input)
- Link to Google Photos album (https://photos.app.goo.gl/E8frgv5QyePtvHZr5)
- Auto-change toggle with interval options (1min, 5min, 15min, 30min, 1hr)
- Cyclic auto-change (wraps around the list)

**Video Wallpapers Screen**
- Demo video wallpaper pre-loaded
- Add from Gallery (video files)
- Add from URL (direct video URL)
- Video preview with play button overlay
- Info card about live wallpaper setup

**Music & Radio Screen**
- AUTO-START on app launch (first SomaFM station)
- Now Playing card with station info, emoji, genre
- Play/Pause, Previous, Next controls
- Volume indicator bar
- 10 SomaFM stations:
  1. Drone Zone (Ambient)
  2. Deep Space One (Space)
  3. Lush (Relaxation)
  4. Sleep (Sleep)
  5. Groove Salad (Chill)
  6. Space Station Soma (Space)
  7. Digitalis (Ambient)
  8. Fluid (Electronic)
  9. Suburban Train (Ambient)
  10. Beat Blender (Electronic)
- Add local music from device (DocumentPicker for audio files)
- Battery optimization: auto-pause on background, resume on foreground

**Particle Effects Screen**
- 8 effect types: None, Rain, Snow, Leaves, Sparkles, Bubbles, Fireflies, Petals
- Real-time preview of selected effect
- 3 intensity levels: Low (20 particles), Medium (40 particles), High (65 particles)
- Smooth reanimated animations at 60fps
- Persisted to AsyncStorage

**Settings Screen**
- App logo (leaf + stars + camera lens symbol)
- Language selector: 12 languages (RU, EN, DE, FR, ES, ZH, JA, KO, PT, IT, TR, AR)
- Social Links:
  - Instagram: @konon_photographer ("Подпишитесь для вдохновения")
  - Email: ninset8@gmail.com ("Обратная связь")
  - Website: NINSET8.wixsite.com/rare ("Профессиональные снимки")
- Permissions section:
  - Live Wallpaper → opens Android wallpaper settings
  - Accessibility → opens Android accessibility settings
- Download APK → Google Drive link
- About section with version info and copyright

**Floating Volume Widget**
- Always visible on all screens (positioned above tab bar)
- Expanded: station name + emoji, play/pause, prev/next, gesture volume slider
- Collapsed: single icon row with play button
- Gesture-based volume slider (PanGestureHandler + TapGesture)
- Volume percentage display
- Collapse/expand toggle button
- Persisted volume level

**Splash Screen**
- 2.8 second animated intro
- Leaf + stars + camera lens logo with spring animation
- "RARE SHOT" title with glow effect
- "LIVE WALLPAPER" subtitle
- Star field background
- Auto-navigates to home dashboard

**Design System**
- Dark green glassmorphism throughout
- Background: #030e06
- Primary: #15803D, Accent: #4ADE80
- Glass: rgba(5,25,12,0.65) + BlurView intensity 20-35
- Border: rgba(255,255,255,0.12)
- All corners rounded (16-24px radius)
- Tab bar: transparent glassmorphism

**Multi-language Support**
- 12 languages: Russian, English, German, French, Spanish, Chinese, Japanese, Korean, Portuguese, Italian, Turkish, Arabic
- Auto-detect device language on first launch
- Persisted language preference

**Battery Optimization**
- AppState listener pauses audio when app goes to background
- Resumes audio when app returns to foreground

## Build & APK Instructions

### To Build APK:
```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo account
eas login

# 3. Configure project (one-time)
eas build:configure

# 4. Build APK
cd /app/frontend
eas build --platform android --profile preview

# 5. Download APK from EAS dashboard
# 6. Upload to Google Drive
```

## Prioritized Backlog

### P0 - Critical / Next Phase
- [ ] Native WallpaperService (requires bare workflow + native Android modules)
  - AnimatedWallpaperService.java for video/particle live wallpapers on home screen
  - Register as system live wallpaper via AndroidManifest
- [ ] AppWidgetProvider (home screen widget)
  - Requires native Android widget XML layouts
  - RemoteViews for music/wallpaper controls

### P1 - High Priority
- [ ] expo-audio migration (replace expo-av when it's fully removed)
- [ ] Lock screen wallpaper (WallpaperManager.setLockScreenWallpaper on API 24+)
- [ ] Double-tap screen lock (AccessibilityService)
- [ ] Capacitor WallpaperManager plugin
- [ ] Video playback as in-app animated wallpaper (expo-video)

### P2 - Nice to Have
- [ ] Google Photos API integration (OAuth, album browsing)
- [ ] Scheduled wallpaper changes (time of day)
- [ ] Widget brightness control
- [ ] Wallpaper favorite/rating system
- [ ] Share wallpaper functionality
- [ ] Push notifications for new wallpapers

## Next Tasks
1. Build APK via EAS Build → upload to Google Drive
2. Implement native WallpaperService for true live wallpaper
3. Add AppWidgetProvider for home screen widgets
4. Migrate expo-av to expo-audio
