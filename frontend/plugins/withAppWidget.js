const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.rareshot.livewallpaper';

// ──────── AppWidgetProvider Java code ────────
const MUSIC_WIDGET_JAVA = `
package ${PACKAGE_NAME};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.widget.RemoteViews;

public class MusicWidgetProvider extends AppWidgetProvider {
    private static final String ACTION_VOLUME_UP = "${PACKAGE_NAME}.VOLUME_UP";
    private static final String ACTION_VOLUME_DOWN = "${PACKAGE_NAME}.VOLUME_DOWN";
    private static final String ACTION_PLAY_PAUSE = "${PACKAGE_NAME}.PLAY_PAUSE";
    private static final String ACTION_NEXT = "${PACKAGE_NAME}.NEXT";
    private static final String ACTION_PREV = "${PACKAGE_NAME}.PREV";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutId(context));

        views.setOnClickPendingIntent(getViewId(context, "btn_vol_up"),
            getPendingIntent(context, ACTION_VOLUME_UP));
        views.setOnClickPendingIntent(getViewId(context, "btn_vol_down"),
            getPendingIntent(context, ACTION_VOLUME_DOWN));
        views.setOnClickPendingIntent(getViewId(context, "btn_play"),
            getPendingIntent(context, ACTION_PLAY_PAUSE));
        views.setOnClickPendingIntent(getViewId(context, "btn_next"),
            getPendingIntent(context, ACTION_NEXT));
        views.setOnClickPendingIntent(getViewId(context, "btn_prev"),
            getPendingIntent(context, ACTION_PREV));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;

        String action = intent.getAction();
        if (ACTION_VOLUME_UP.equals(action)) {
            audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, 0);
        } else if (ACTION_VOLUME_DOWN.equals(action)) {
            audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, 0);
        }
    }

    private static PendingIntent getPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MusicWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, action.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int getLayoutId(Context context) {
        return context.getResources().getIdentifier("widget_music", "layout", context.getPackageName());
    }

    private static int getViewId(Context context, String name) {
        return context.getResources().getIdentifier(name, "id", context.getPackageName());
    }
}
`;

// ──────── Widget layout XML ────────
const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="#88032e16"
    android:gravity="center"
    android:orientation="horizontal"
    android:padding="8dp">

    <ImageButton
        android:id="@+id/btn_vol_down"
        android:layout_width="40dp"
        android:layout_height="40dp"
        android:background="?android:attr/selectableItemBackgroundBorderless"
        android:contentDescription="Volume Down"
        android:src="@android:drawable/ic_media_rew"
        android:tint="#4ade80" />

    <ImageButton
        android:id="@+id/btn_prev"
        android:layout_width="40dp"
        android:layout_height="40dp"
        android:background="?android:attr/selectableItemBackgroundBorderless"
        android:contentDescription="Previous"
        android:src="@android:drawable/ic_media_previous"
        android:tint="#a7f3d0" />

    <ImageButton
        android:id="@+id/btn_play"
        android:layout_width="48dp"
        android:layout_height="48dp"
        android:background="?android:attr/selectableItemBackgroundBorderless"
        android:contentDescription="Play/Pause"
        android:src="@android:drawable/ic_media_play"
        android:tint="#4ade80" />

    <ImageButton
        android:id="@+id/btn_next"
        android:layout_width="40dp"
        android:layout_height="40dp"
        android:background="?android:attr/selectableItemBackgroundBorderless"
        android:contentDescription="Next"
        android:src="@android:drawable/ic_media_next"
        android:tint="#a7f3d0" />

    <ImageButton
        android:id="@+id/btn_vol_up"
        android:layout_width="40dp"
        android:layout_height="40dp"
        android:background="?android:attr/selectableItemBackgroundBorderless"
        android:contentDescription="Volume Up"
        android:src="@android:drawable/ic_media_ff"
        android:tint="#4ade80" />
</LinearLayout>
`;

// ──────── Widget info XML ────────
const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="40dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="86400000"
    android:initialLayout="@layout/widget_music"
    android:widgetCategory="home_screen"
    android:description="@string/app_name" />
`;

// ──────── Config Plugin ────────
const withAppWidget = (config) => {
  // 1. Modify AndroidManifest.xml to add widget receiver
  config = withAndroidManifest(config, (newConfig) => {
    const manifest = newConfig.modResults.manifest;
    const application = manifest.application?.[0];

    if (application) {
      application.receiver = application.receiver || [];

      const exists = application.receiver.some(
        r => r.$?.['android:name'] === '.MusicWidgetProvider'
      );

      if (!exists) {
        application.receiver.push({
          $: {
            'android:name': '.MusicWidgetProvider',
            'android:exported': 'true',
          },
          'intent-filter': [{
            action: [{
              $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' },
            }],
          }],
          'meta-data': [{
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_music_info',
            },
          }],
        });
      }
    }

    return newConfig;
  });

  // 2. Write native files
  config = withDangerousMod(config, ['android', async (newConfig) => {
    const projectRoot = newConfig.modRequest.projectRoot;
    const androidRoot = path.join(projectRoot, 'android');
    const javaDir = path.join(androidRoot, 'app', 'src', 'main', 'java', ...PACKAGE_NAME.split('.'));
    const xmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
    const layoutDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'layout');

    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.mkdirSync(layoutDir, { recursive: true });

    // Write Java
    fs.writeFileSync(path.join(javaDir, 'MusicWidgetProvider.java'), MUSIC_WIDGET_JAVA);

    // Write layout
    fs.writeFileSync(path.join(layoutDir, 'widget_music.xml'), WIDGET_LAYOUT_XML);

    // Write widget info
    fs.writeFileSync(path.join(xmlDir, 'widget_music_info.xml'), WIDGET_INFO_XML);

    return newConfig;
  }]);

  return config;
};

module.exports = withAppWidget;
