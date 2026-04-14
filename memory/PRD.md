# Rare Shot Live Wallpaper - PRD

## Product Overview
**Name:** Rare Shot Live Wallpaper  
**Version:** 1.0.0  
**Platform:** Android (Expo React Native)  
**Author:** konon_photographer

## Core Features

### 1. Photo Wallpapers
- Load photos from Google Photos shared album (34+ photos)
- Add photos from device gallery (via DocumentPicker)
- Add photos by URL
- Auto-change wallpapers with timer (1min, 5min, 15min, 30min, 1hr)
- Cyclic/shuffle mode
- Set wallpaper on home screen / lock screen / both (native Android only)

### 2. Video Wallpapers
- Add videos from device gallery
- Add videos by URL
- Full-screen video preview
- Set as live wallpaper (native Android only)

### 3. Music / Radio
- 10 built-in radio stations (SomaFM - nature/relaxation theme)
- Auto-play on app launch
- Play/Pause/Next/Previous controls
- Volume control with gesture slider
- Local music file support
- Background playback with pause on screen off

### 4. Particle Effects
- 8 effect types: None, Rain, Snow, Leaves, Sparkles, Bubbles, Fireflies, Petals
- 3 intensity levels: Low, Medium, High
- Real-time animated overlay
- Persisted effect selection

### 5. Volume Widget
- Floating semi-transparent widget
- Collapse/expand toggle
- Volume slider with swipe gesture
- Radio controls (play/pause, next/prev)
- Positioned above tab bar

### 6. Multi-language Support
- 12 languages: English, Russian, German, French, Spanish, Chinese, Japanese, Korean, Portuguese, Italian, Turkish, Arabic
- RTL support for Arabic
- Auto-detect device language

### 7. Settings
- Language selector
- Social links (Instagram, Email, Website)
- Widget info (Music, Photo, Effects widgets)
- Live wallpaper & accessibility settings
- About section

### 8. Glassmorphism Design
- Dark green nature theme
- BlurView glass effect
- Rounded corners
- Semi-transparent surfaces
- Particle effects overlay

## Technical Stack
- **Frontend:** React Native + Expo SDK 54
- **Backend:** FastAPI + MongoDB
- **Navigation:** Expo Router (file-based)
- **Audio:** expo-audio
- **Animations:** react-native-reanimated
- **Gestures:** react-native-gesture-handler
- **UI:** expo-blur, expo-linear-gradient, @expo/vector-icons

## Backend API Endpoints
- `GET /api/` - Health check
- `GET /api/google-photos?album_url=...` - Scrape Google Photos album
- `POST /api/status` - Create status check
- `GET /api/status` - Get status checks

## Social Links
- Instagram: @konon_photographer
- Email: ninset8@gmail.com
- Website: NINSET8.wixsite.com/rare

## Future Enhancements
- Native WallpaperService for Android APK build
- AppWidgetProvider for home screen widgets
- AccessibilityService for double-tap screen off
- Premium wallpaper packs (monetization opportunity)
- Push notifications for daily wallpaper recommendations
