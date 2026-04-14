// Expo Config Plugin for Rare Shot Live Wallpaper
// Registers WallpaperService, 3 AppWidgetProviders in AndroidManifest
// and copies all native Java/XML/drawable source files during prebuild

const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// ─── AndroidManifest: add wallpaper service + 3 widgets ─────────────────────
const withLiveWallpaperManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    if (!app.service) app.service = [];
    if (!app.receiver) app.receiver = [];

    // --- WallpaperService ---
    if (!app.service.some((s) => s.$?.['android:name']?.includes('RareShotWallpaperService'))) {
      app.service.push({
        $: {
          'android:name': '.RareShotWallpaperService',
          'android:label': 'Rare Shot Live Wallpaper',
          'android:permission': 'android.permission.BIND_WALLPAPER',
          'android:exported': 'true',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.service.wallpaper.WallpaperService' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.service.wallpaper', 'android:resource': '@xml/wallpaper' } }],
      });
    }

    // --- Helper to add a widget receiver ---
    const addWidget = (name, xmlResource) => {
      if (!app.receiver.some((r) => r.$?.['android:name']?.includes(name))) {
        app.receiver.push({
          $: { 'android:name': '.' + name, 'android:exported': 'true' },
          'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
          'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/' + xmlResource } }],
        });
      }
    };

    addWidget('RareShotWidget', 'widget_info');           // legacy
    addWidget('RareShotMusicWidget', 'widget_music_info');  // 4x1 music
    addWidget('RareShotPhotoWidget', 'widget_photo_info');  // 2x2 photo
    addWidget('RareShotEffectsWidget', 'widget_effects_info'); // 2x1 effects

    return config;
  });
};

// ─── Copy all native source files during prebuild ────────────────────────────
const withNativeFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;
      const packageDir = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'rareshot', 'livewallpaper');
      const resXmlDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'xml');
      const resLayoutDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'layout');
      const resDrawableDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'drawable');

      [packageDir, resXmlDir, resLayoutDir, resDrawableDir].forEach((dir) => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });

      const nativeDir = path.join(__dirname, '..', 'android-native');

      // Java files
      const javaSrc = path.join(nativeDir, 'java');
      if (fs.existsSync(javaSrc)) {
        fs.readdirSync(javaSrc).forEach((f) => {
          fs.copyFileSync(path.join(javaSrc, f), path.join(packageDir, f));
          console.log('[RareShot] Copied Java:', f);
        });
      }

      // XML resources
      const xmlSrc = path.join(nativeDir, 'res', 'xml');
      if (fs.existsSync(xmlSrc)) {
        fs.readdirSync(xmlSrc).forEach((f) => {
          fs.copyFileSync(path.join(xmlSrc, f), path.join(resXmlDir, f));
          console.log('[RareShot] Copied XML:', f);
        });
      }

      // Layout resources
      const layoutSrc = path.join(nativeDir, 'res', 'layout');
      if (fs.existsSync(layoutSrc)) {
        fs.readdirSync(layoutSrc).forEach((f) => {
          fs.copyFileSync(path.join(layoutSrc, f), path.join(resLayoutDir, f));
          console.log('[RareShot] Copied layout:', f);
        });
      }

      // Drawable resources
      const drawableSrc = path.join(nativeDir, 'res', 'drawable');
      if (fs.existsSync(drawableSrc)) {
        fs.readdirSync(drawableSrc).forEach((f) => {
          fs.copyFileSync(path.join(drawableSrc, f), path.join(resDrawableDir, f));
          console.log('[RareShot] Copied drawable:', f);
        });
      }

      // Values resources (strings.xml)
      const resValuesDir = path.join(androidDir, 'app', 'src', 'main', 'res', 'values');
      if (!fs.existsSync(resValuesDir)) fs.mkdirSync(resValuesDir, { recursive: true });
      const valuesSrc = path.join(nativeDir, 'res', 'values');
      if (fs.existsSync(valuesSrc)) {
        fs.readdirSync(valuesSrc).forEach((f) => {
          const dest = path.join(resValuesDir, f);
          // Don't overwrite existing strings.xml to avoid conflicts
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(path.join(valuesSrc, f), dest);
            console.log('[RareShot] Copied values:', f);
          }
        });
      }

      return config;
    },
  ]);
};

// ─── Patch MainApplication.kt to register WallpaperPackage ──────────────────
const withWallpaperPackage = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidDir = config.modRequest.platformProjectRoot;
      const mainAppPath = path.join(
        androidDir, 'app', 'src', 'main', 'java',
        'com', 'rareshot', 'livewallpaper', 'MainApplication.kt'
      );

      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf8');

        if (!content.includes('WallpaperPackage')) {
          // Register WallpaperPackage right after the comment about manual packages
          content = content.replace(
            '// add(MyReactNativePackage())',
            '// add(MyReactNativePackage())\n              add(WallpaperPackage())'
          );
          fs.writeFileSync(mainAppPath, content, 'utf8');
          console.log('[RareShot] Registered WallpaperPackage in MainApplication.kt');
        } else {
          console.log('[RareShot] WallpaperPackage already registered, skipping.');
        }
      } else {
        console.warn('[RareShot] MainApplication.kt not found at:', mainAppPath);
      }

      return config;
    },
  ]);
};

module.exports = (config) => {
  config = withLiveWallpaperManifest(config);
  config = withNativeFiles(config);
  config = withWallpaperPackage(config);
  return config;
};
