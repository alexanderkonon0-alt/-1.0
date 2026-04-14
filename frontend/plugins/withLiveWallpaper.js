const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.rareshot.livewallpaper';

// ──────── Native WallpaperService Java code ────────
const WALLPAPER_SERVICE_JAVA = `
package ${PACKAGE_NAME};

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Handler;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import java.io.InputStream;
import java.net.URL;

public class LiveWallpaperService extends WallpaperService {
    @Override
    public Engine onCreateEngine() {
        return new LiveWallpaperEngine();
    }

    private class LiveWallpaperEngine extends Engine {
        private final Handler handler = new Handler();
        private boolean visible = true;
        private Bitmap wallpaperBitmap;
        private int screenWidth, screenHeight;
        private final Paint paint = new Paint();

        private final Runnable drawRunner = new Runnable() {
            @Override
            public void run() {
                draw();
            }
        };

        @Override
        public void onVisibilityChanged(boolean visible) {
            this.visible = visible;
            if (visible) {
                handler.post(drawRunner);
            } else {
                handler.removeCallbacks(drawRunner);
            }
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            super.onSurfaceChanged(holder, format, width, height);
            this.screenWidth = width;
            this.screenHeight = height;
            loadWallpaper();
        }

        @Override
        public void onSurfaceCreated(SurfaceHolder holder) {
            super.onSurfaceCreated(holder);
            loadWallpaper();
        }

        @Override
        public void onSurfaceDestroyed(SurfaceHolder holder) {
            super.onSurfaceDestroyed(holder);
            visible = false;
            handler.removeCallbacks(drawRunner);
        }

        private void loadWallpaper() {
            try {
                SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());
                String uriString = prefs.getString("wallpaper_uri", null);
                if (uriString != null) {
                    if (uriString.startsWith("http")) {
                        new Thread(() -> {
                            try {
                                URL url = new URL(uriString);
                                InputStream is = url.openStream();
                                wallpaperBitmap = BitmapFactory.decodeStream(is);
                                is.close();
                                handler.post(drawRunner);
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }).start();
                    } else {
                        try {
                            Uri uri = Uri.parse(uriString);
                            InputStream is = getContentResolver().openInputStream(uri);
                            wallpaperBitmap = BitmapFactory.decodeStream(is);
                            if (is != null) is.close();
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            handler.post(drawRunner);
        }

        private void draw() {
            SurfaceHolder holder = getSurfaceHolder();
            Canvas canvas = null;
            try {
                canvas = holder.lockCanvas();
                if (canvas != null) {
                    canvas.drawColor(Color.BLACK);
                    if (wallpaperBitmap != null && !wallpaperBitmap.isRecycled()) {
                        Bitmap scaled = Bitmap.createScaledBitmap(wallpaperBitmap, screenWidth, screenHeight, true);
                        canvas.drawBitmap(scaled, 0, 0, paint);
                        if (scaled != wallpaperBitmap) {
                            scaled.recycle();
                        }
                    }
                }
            } finally {
                if (canvas != null) {
                    holder.unlockCanvasAndPost(canvas);
                }
            }
            handler.removeCallbacks(drawRunner);
            if (visible) {
                handler.postDelayed(drawRunner, 33); // ~30fps
            }
        }
    }
}
`;

// ──────── Native WallpaperModule (React Native bridge) ────────
const WALLPAPER_MODULE_JAVA = `
package ${PACKAGE_NAME};

import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class WallpaperModule extends ReactContextBaseJavaModule {
    public WallpaperModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "WallpaperModule";
    }

    @ReactMethod
    public void setWallpaperUri(String uri, Promise promise) {
        try {
            SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getReactApplicationContext());
            prefs.edit().putString("wallpaper_uri", uri).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SET_URI_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void launchWallpaperPicker(Promise promise) {
        try {
            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(
                WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                new ComponentName(getReactApplicationContext(), LiveWallpaperService.class)
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("LAUNCH_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void openWallpaperChooser(Promise promise) {
        try {
            Intent intent = new Intent(Intent.ACTION_SET_WALLPAPER);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CHOOSER_ERROR", e.getMessage());
        }
    }
}
`;

// ──────── Native WallpaperPackage (register module) ────────
const WALLPAPER_PACKAGE_JAVA = `
package ${PACKAGE_NAME};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class WallpaperPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new WallpaperModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// ──────── Wallpaper XML metadata ────────
const WALLPAPER_XML = `<?xml version="1.0" encoding="utf-8"?>
<wallpaper xmlns:android="http://schemas.android.com/apk/res/android"
    android:label="Rare Shot Live Wallpaper"
    android:thumbnail="@mipmap/ic_launcher" />
`;

// ──────── Config Plugin ────────
const withLiveWallpaper = (config) => {
  // 1. Modify AndroidManifest.xml
  config = withAndroidManifest(config, (newConfig) => {
    const manifest = newConfig.modResults.manifest;
    const application = manifest.application?.[0];

    if (application) {
      // Add WallpaperService
      application.service = application.service || [];
      
      // Check if already exists
      const exists = application.service.some(
        s => s.$?.['android:name'] === '.LiveWallpaperService'
      );
      
      if (!exists) {
        application.service.push({
          $: {
            'android:name': '.LiveWallpaperService',
            'android:label': 'Rare Shot Live Wallpaper',
            'android:permission': 'android.permission.BIND_WALLPAPER',
            'android:exported': 'true',
          },
          'intent-filter': [{
            action: [{
              $: { 'android:name': 'android.service.wallpaper.WallpaperService' },
            }],
          }],
          'meta-data': [{
            $: {
              'android:name': 'android.service.wallpaper',
              'android:resource': '@xml/wallpaper',
            },
          }],
        });
      }
    }

    return newConfig;
  });

  // 2. Write native Java files and XML resources
  config = withDangerousMod(config, ['android', async (newConfig) => {
    const projectRoot = newConfig.modRequest.projectRoot;
    const androidRoot = path.join(projectRoot, 'android');
    const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java', ...PACKAGE_NAME.split('.'));
    const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');

    // Create directories
    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });

    // Write Java files
    fs.writeFileSync(path.join(javaDir, 'LiveWallpaperService.java'), WALLPAPER_SERVICE_JAVA);
    fs.writeFileSync(path.join(javaDir, 'WallpaperModule.java'), WALLPAPER_MODULE_JAVA);
    fs.writeFileSync(path.join(javaDir, 'WallpaperPackage.java'), WALLPAPER_PACKAGE_JAVA);
    
    // Write wallpaper XML
    fs.writeFileSync(path.join(xmlDir, 'wallpaper.xml'), WALLPAPER_XML);

    // Register WallpaperPackage in MainApplication.java
    const mainAppPath = path.join(javaDir, 'MainApplication.java');
    if (fs.existsSync(mainAppPath)) {
      let mainAppContent = fs.readFileSync(mainAppPath, 'utf8');
      if (!mainAppContent.includes('WallpaperPackage')) {
        mainAppContent = mainAppContent.replace(
          'packages.add(new com.facebook.react.shell.MainReactPackage());',
          'packages.add(new com.facebook.react.shell.MainReactPackage());\n          packages.add(new WallpaperPackage());'
        );
        fs.writeFileSync(mainAppPath, mainAppContent);
      }
    }

    return newConfig;
  }]);

  return config;
};

module.exports = withLiveWallpaper;
