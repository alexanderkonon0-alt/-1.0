package com.rareshot.livewallpaper;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * WallpaperModule - React Native bridge for Android Live Wallpaper
 * Provides methods to launch the live wallpaper picker and set wallpaper URI.
 */
public class WallpaperModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "WallpaperModule";
    private static final String PREFS_NAME = "RareShotPrefs";
    private static final String KEY_URI = "currentWallpaperUri";

    WallpaperModule(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Launch the Android live wallpaper picker, pre-selecting our service.
     * The user will see a preview and can confirm by pressing "Set wallpaper".
     */
    @ReactMethod
    public void launchWallpaperPicker(Promise promise) {
        try {
            ComponentName component = new ComponentName(
                "com.rareshot.livewallpaper",
                "com.rareshot.livewallpaper.RareShotWallpaperService"
            );
            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, component);

            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("WALLPAPER_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Save the selected wallpaper URI to SharedPreferences.
     * The WallpaperService reads this value to display the correct image.
     */
    @ReactMethod
    public void setWallpaperUri(String uri, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(KEY_URI, uri).apply();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("PREFS_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Open the full live wallpaper chooser (shows all available live wallpapers).
     */
    @ReactMethod
    public void openWallpaperChooser(Promise promise) {
        try {
            Intent intent = new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER);
            Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
            }
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("CHOOSER_ERROR", e.getMessage(), e);
        }
    }
}
