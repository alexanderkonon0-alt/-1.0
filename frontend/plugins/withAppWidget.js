const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.relaxsound.livewallpaper';
const PREFS = 'relaxsound_prefs';

// ─── MusicWidgetProvider.java ──────────────────────────────────────────────────
// Volume controls the APP's MediaPlayer only (not system volume).
// Uses a ProgressBar visual + increment/decrement buttons (compatible with all Android).
const MUSIC_WIDGET_JAVA = `package ${PACKAGE_NAME};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MusicWidgetProvider extends AppWidgetProvider {
    private static final String PREFS    = "${PREFS}";
    private static final String A_PLAY  = "${PACKAGE_NAME}.PLAY";
    private static final String A_NEXT  = "${PACKAGE_NAME}.NEXT";
    private static final String A_PREV  = "${PACKAGE_NAME}.PREV";
    private static final String A_VOL_UP = "${PACKAGE_NAME}.APP_VOL_UP";
    private static final String A_VOL_DN = "${PACKAGE_NAME}.APP_VOL_DN";
    private static final String A_FX    = "${PACKAGE_NAME}.FX_TOGGLE";
    private static final String A_PHOTO = "${PACKAGE_NAME}.PHOTO_NEXT";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) update(c, m, id);
    }

    static void update(Context c, AppWidgetManager m, int id) {
        int layoutId = c.getResources().getIdentifier("widget_music", "layout", c.getPackageName());
        if (layoutId == 0) return;
        RemoteViews v = new RemoteViews(c.getPackageName(), layoutId);

        int btnPlay   = c.getResources().getIdentifier("btn_play",      "id", c.getPackageName());
        int btnNext   = c.getResources().getIdentifier("btn_next",      "id", c.getPackageName());
        int btnPrev   = c.getResources().getIdentifier("btn_prev",      "id", c.getPackageName());
        int btnVolUp  = c.getResources().getIdentifier("btn_vol_up",    "id", c.getPackageName());
        int btnVolDn  = c.getResources().getIdentifier("btn_vol_dn",    "id", c.getPackageName());
        int btnFx     = c.getResources().getIdentifier("btn_fx",        "id", c.getPackageName());
        int btnPhoto  = c.getResources().getIdentifier("btn_photo",     "id", c.getPackageName());
        int volBar    = c.getResources().getIdentifier("vol_progress",  "id", c.getPackageName());
        int txtStation= c.getResources().getIdentifier("txt_station",   "id", c.getPackageName());
        int txtVol    = c.getResources().getIdentifier("txt_vol",       "id", c.getPackageName());

        if (btnPlay  != 0) v.setOnClickPendingIntent(btnPlay,  pi(c, A_PLAY));
        if (btnNext  != 0) v.setOnClickPendingIntent(btnNext,  pi(c, A_NEXT));
        if (btnPrev  != 0) v.setOnClickPendingIntent(btnPrev,  pi(c, A_PREV));
        if (btnVolUp != 0) v.setOnClickPendingIntent(btnVolUp, pi(c, A_VOL_UP));
        if (btnVolDn != 0) v.setOnClickPendingIntent(btnVolDn, pi(c, A_VOL_DN));
        if (btnFx    != 0) v.setOnClickPendingIntent(btnFx,    pi(c, A_FX));
        if (btnPhoto != 0) v.setOnClickPendingIntent(btnPhoto, pi(c, A_PHOTO));

        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String stationName = sp.getString("station_name", "Drone Zone");
        float appVol = sp.getFloat("app_volume", 0.8f);
        int volPct = Math.round(appVol * 100);

        if (txtStation != 0) v.setTextViewText(txtStation, "\\u266B " + stationName);
        if (volBar     != 0) v.setProgressBar(volBar, 100, volPct, false);
        if (txtVol     != 0) v.setTextViewText(txtVol, volPct + "%");

        m.updateAppWidget(id, v);
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        String a = i.getAction();
        if (a == null) return;

        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        switch (a) {
            case A_PLAY: {
                Intent svc = new Intent(c, AudioService.class);
                svc.setAction("TOGGLE");
                startSvc(c, svc);
                break;
            }
            case A_NEXT: {
                Intent svc = new Intent(c, AudioService.class);
                svc.setAction("NEXT");
                startSvc(c, svc);
                break;
            }
            case A_PREV: {
                Intent svc = new Intent(c, AudioService.class);
                svc.setAction("PREV");
                startSvc(c, svc);
                break;
            }
            case A_VOL_UP: {
                // Increment APP volume by 10% — sends to AudioService MediaPlayer ONLY
                float vol = sp.getFloat("app_volume", 0.8f) + 0.1f;
                if (vol > 1.0f) vol = 1.0f;
                sp.edit().putFloat("app_volume", vol).apply();
                Intent svc = new Intent(c, AudioService.class);
                svc.setAction("SET_VOLUME");
                svc.putExtra("volume", vol);
                startSvc(c, svc);
                break;
            }
            case A_VOL_DN: {
                // Decrement APP volume by 10% — sends to AudioService MediaPlayer ONLY
                float vol = sp.getFloat("app_volume", 0.8f) - 0.1f;
                if (vol < 0.0f) vol = 0.0f;
                sp.edit().putFloat("app_volume", vol).apply();
                Intent svc = new Intent(c, AudioService.class);
                svc.setAction("SET_VOLUME");
                svc.putExtra("volume", vol);
                startSvc(c, svc);
                break;
            }
            case A_FX: {
                String[] effects = {"none","rain","snow","leaves","sparkles","bubbles","fireflies","petals"};
                String cur = sp.getString("effect_type", "none");
                int ei = 0;
                for (int j = 0; j < effects.length; j++) if (effects[j].equals(cur)) { ei = j; break; }
                ei = (ei + 1) % effects.length;
                sp.edit().putString("effect_type", effects[ei]).apply();
                break;
            }
            case A_PHOTO: {
                int idx = sp.getInt("wallpaper_index", 0);
                try {
                    org.json.JSONArray uris = new org.json.JSONArray(sp.getString("wallpaper_uris", "[]"));
                    if (uris.length() > 0) {
                        idx = (idx + 1) % uris.length();
                        sp.edit().putInt("wallpaper_index", idx)
                            .putString("wallpaper_uri", uris.getString(idx)).apply();
                    }
                } catch (Exception e) {}
                break;
            }
        }

        // Refresh all widget instances
        AppWidgetManager wm = AppWidgetManager.getInstance(c);
        int[] ids = wm.getAppWidgetIds(new ComponentName(c, MusicWidgetProvider.class));
        for (int id : ids) update(c, wm, id);
    }

    private static void startSvc(Context c, Intent svc) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            c.startForegroundService(svc);
        } else {
            c.startService(svc);
        }
    }

    static PendingIntent pi(Context c, String a) {
        Intent i = new Intent(c, MusicWidgetProvider.class);
        i.setAction(a);
        return PendingIntent.getBroadcast(c, a.hashCode(), i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
`;

// ─── Widget layout XML — volume slider (ProgressBar + -/+ buttons) ─────────────
const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="4dp">

    <!-- Station name + transport controls -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:background="#DD041a0d"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingStart="12dp"
        android:paddingEnd="8dp">

        <ImageButton
            android:id="@+id/btn_prev"
            android:layout_width="38dp"
            android:layout_height="38dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Prev"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_previous" />

        <ImageButton
            android:id="@+id/btn_play"
            android:layout_width="44dp"
            android:layout_height="44dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Play/Pause"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_play" />

        <ImageButton
            android:id="@+id/btn_next"
            android:layout_width="38dp"
            android:layout_height="38dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Next"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_next" />

        <TextView
            android:id="@+id/txt_station"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="\\u266B Drone Zone"
            android:textColor="#4ade80"
            android:textSize="12sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end"
            android:paddingStart="8dp" />
    </LinearLayout>

    <!-- Volume slider row: [−] [====ProgressBar====] [+] [80%] -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="40dp"
        android:background="#CC052e16"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingStart="8dp"
        android:paddingEnd="8dp">

        <!-- Volume icon/label -->
        <TextView
            android:layout_width="28dp"
            android:layout_height="wrap_content"
            android:text="\\uD83D\\uDD09"
            android:textSize="14sp"
            android:gravity="center" />

        <!-- Decrement volume 10% — controls APP volume only, NOT system -->
        <Button
            android:id="@+id/btn_vol_dn"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:text="\\u2212"
            android:textColor="#4ade80"
            android:textSize="18sp"
            android:textStyle="bold"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:padding="0dp" />

        <!-- Visual progress bar showing current app volume -->
        <ProgressBar
            android:id="@+id/vol_progress"
            style="@android:style/Widget.ProgressBar.Horizontal"
            android:layout_width="0dp"
            android:layout_height="8dp"
            android:layout_weight="1"
            android:max="100"
            android:progress="80"
            android:progressTint="#4ade80"
            android:progressBackgroundTint="#1a4a2e"
            android:layout_marginStart="4dp"
            android:layout_marginEnd="4dp" />

        <!-- Increment volume 10% — controls APP volume only, NOT system -->
        <Button
            android:id="@+id/btn_vol_up"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:text="+"
            android:textColor="#4ade80"
            android:textSize="18sp"
            android:textStyle="bold"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:padding="0dp" />

        <TextView
            android:id="@+id/txt_vol"
            android:layout_width="38dp"
            android:layout_height="wrap_content"
            android:text="80%"
            android:textColor="#a7f3d0"
            android:textSize="10sp"
            android:gravity="end" />
    </LinearLayout>

    <!-- Effects + Next Photo buttons -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="36dp"
        android:background="#BB052e16"
        android:gravity="center"
        android:orientation="horizontal">

        <Button
            android:id="@+id/btn_fx"
            android:layout_width="0dp"
            android:layout_height="30dp"
            android:layout_weight="1"
            android:text="\\u2728 Effects"
            android:textColor="#a7f3d0"
            android:textSize="10sp"
            android:background="?android:attr/selectableItemBackground" />

        <Button
            android:id="@+id/btn_photo"
            android:layout_width="0dp"
            android:layout_height="30dp"
            android:layout_weight="1"
            android:text="\\uD83D\\uDDBC Next Photo"
            android:textColor="#a7f3d0"
            android:textSize="10sp"
            android:background="?android:attr/selectableItemBackground" />
    </LinearLayout>
</LinearLayout>
`;

const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:resizeMode="horizontal|vertical"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_music"
    android:widgetCategory="home_screen"
    android:previewLayout="@layout/widget_music" />
`;

const withAppWidget = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    app.receiver = app.receiver || [];
    if (!app.receiver.some(r => r.$?.['android:name'] === '.MusicWidgetProvider')) {
      app.receiver.push({
        $: {
          'android:name': '.MusicWidgetProvider',
          'android:exported': 'true',
          'android:label': 'Relax Sound Widget',
        },
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] }],
        'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/widget_music_info' } }],
      });
    }
    return cfg;
  });

  config = withDangerousMod(config, ['android', async (cfg) => {
    const root = cfg.modRequest.projectRoot;
    const andro = path.join(root, 'android');
    const jDir = path.join(andro, 'app', 'src', 'main', 'java', ...PACKAGE_NAME.split('.'));
    const xmlDir = path.join(andro, 'app', 'src', 'main', 'res', 'xml');
    const layoutDir = path.join(andro, 'app', 'src', 'main', 'res', 'layout');

    fs.mkdirSync(jDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.mkdirSync(layoutDir, { recursive: true });

    fs.writeFileSync(path.join(jDir, 'MusicWidgetProvider.java'), MUSIC_WIDGET_JAVA);
    fs.writeFileSync(path.join(layoutDir, 'widget_music.xml'), WIDGET_LAYOUT_XML);
    fs.writeFileSync(path.join(xmlDir, 'widget_music_info.xml'), WIDGET_INFO_XML);

    return cfg;
  }]);

  return config;
};

module.exports = withAppWidget;
