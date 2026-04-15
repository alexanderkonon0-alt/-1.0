const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'com.rareshot.livewallpaper';

const MUSIC_WIDGET_JAVA = `package ${PACKAGE_NAME};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.widget.RemoteViews;

public class MusicWidgetProvider extends AppWidgetProvider {
    private static final String PREFS = "rareshot_prefs";
    private static final String A_VOL_UP = "${PACKAGE_NAME}.VOL_UP";
    private static final String A_VOL_DN = "${PACKAGE_NAME}.VOL_DN";
    private static final String A_PLAY = "${PACKAGE_NAME}.PLAY";
    private static final String A_NEXT = "${PACKAGE_NAME}.NEXT";
    private static final String A_PREV = "${PACKAGE_NAME}.PREV";
    private static final String A_FX = "${PACKAGE_NAME}.FX_TOGGLE";
    private static final String A_PHOTO = "${PACKAGE_NAME}.PHOTO_NEXT";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) update(c, m, id);
    }

    static void update(Context c, AppWidgetManager m, int id) {
        int layoutId = c.getResources().getIdentifier("widget_music", "layout", c.getPackageName());
        if (layoutId == 0) return;
        RemoteViews v = new RemoteViews(c.getPackageName(), layoutId);
        
        int btnVU = c.getResources().getIdentifier("btn_vol_up", "id", c.getPackageName());
        int btnVD = c.getResources().getIdentifier("btn_vol_down", "id", c.getPackageName());
        int btnPlay = c.getResources().getIdentifier("btn_play", "id", c.getPackageName());
        int btnNext = c.getResources().getIdentifier("btn_next", "id", c.getPackageName());
        int btnPrev = c.getResources().getIdentifier("btn_prev", "id", c.getPackageName());
        int btnFx = c.getResources().getIdentifier("btn_fx", "id", c.getPackageName());
        int btnPhoto = c.getResources().getIdentifier("btn_photo", "id", c.getPackageName());
        int txtStation = c.getResources().getIdentifier("txt_station", "id", c.getPackageName());

        if (btnVU != 0) v.setOnClickPendingIntent(btnVU, pi(c, A_VOL_UP));
        if (btnVD != 0) v.setOnClickPendingIntent(btnVD, pi(c, A_VOL_DN));
        if (btnPlay != 0) v.setOnClickPendingIntent(btnPlay, pi(c, A_PLAY));
        if (btnNext != 0) v.setOnClickPendingIntent(btnNext, pi(c, A_NEXT));
        if (btnPrev != 0) v.setOnClickPendingIntent(btnPrev, pi(c, A_PREV));
        if (btnFx != 0) v.setOnClickPendingIntent(btnFx, pi(c, A_FX));
        if (btnPhoto != 0) v.setOnClickPendingIntent(btnPhoto, pi(c, A_PHOTO));

        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String station = sp.getString("station_name", "Rare Shot Radio");
        if (txtStation != 0) v.setTextViewText(txtStation, station);

        m.updateAppWidget(id, v);
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        String a = i.getAction();
        if (a == null) return;
        AudioManager am = (AudioManager) c.getSystemService(Context.AUDIO_SERVICE);
        SharedPreferences sp = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        switch (a) {
            case A_VOL_UP:
                if (am != null) am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_RAISE, AudioManager.FLAG_SHOW_UI);
                break;
            case A_VOL_DN:
                if (am != null) am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_LOWER, AudioManager.FLAG_SHOW_UI);
                break;
            case A_NEXT: {
                int idx = sp.getInt("station_index", 0) + 1;
                if (idx > 9) idx = 0;
                sp.edit().putInt("station_index", idx).putBoolean("station_changed", true).apply();
                break;
            }
            case A_PREV: {
                int idx = sp.getInt("station_index", 0) - 1;
                if (idx < 0) idx = 9;
                sp.edit().putInt("station_index", idx).putBoolean("station_changed", true).apply();
                break;
            }
            case A_FX: {
                String[] effects = {"none","rain","snow","leaves","sparkles","bubbles","fireflies","petals"};
                String cur = sp.getString("effect_type", "none");
                int ei = 0;
                for (int j = 0; j < effects.length; j++) if (effects[j].equals(cur)) ei = j;
                ei = (ei + 1) % effects.length;
                sp.edit().putString("effect_type", effects[ei]).apply();
                break;
            }
            case A_PHOTO: {
                sp.edit().putBoolean("next_wallpaper", true).apply();
                break;
            }
        }
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, MusicWidgetProvider.class));
        for (int id : ids) update(c, m, id);
    }

    static PendingIntent pi(Context c, String a) {
        Intent i = new Intent(c, MusicWidgetProvider.class);
        i.setAction(a);
        return PendingIntent.getBroadcast(c, a.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
`;

const WIDGET_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:background="@android:color/transparent"
    android:gravity="center_vertical"
    android:orientation="vertical"
    android:padding="4dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="#CC0A3622"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingStart="12dp"
        android:paddingEnd="8dp"
        android:paddingTop="8dp"
        android:paddingBottom="8dp">

        <TextView
            android:id="@+id/txt_station"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Rare Shot Radio"
            android:textColor="#4ade80"
            android:textSize="13sp"
            android:textStyle="bold"
            android:maxLines="1"
            android:ellipsize="end" />

        <ImageButton
            android:id="@+id/btn_vol_down"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Vol-"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_rew" />

        <ImageButton
            android:id="@+id/btn_prev"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Prev"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_previous" />

        <ImageButton
            android:id="@+id/btn_play"
            android:layout_width="42dp"
            android:layout_height="42dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Play"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_play" />

        <ImageButton
            android:id="@+id/btn_next"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Next"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_next" />

        <ImageButton
            android:id="@+id/btn_vol_up"
            android:layout_width="36dp"
            android:layout_height="36dp"
            android:background="?android:attr/selectableItemBackgroundBorderless"
            android:contentDescription="Vol+"
            android:scaleType="centerInside"
            android:src="@android:drawable/ic_media_ff" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:background="#CC0A3622"
        android:gravity="center"
        android:orientation="horizontal"
        android:paddingTop="4dp"
        android:paddingBottom="8dp">

        <Button
            android:id="@+id/btn_fx"
            android:layout_width="wrap_content"
            android:layout_height="32dp"
            android:text="Effects"
            android:textColor="#a7f3d0"
            android:textSize="11sp"
            android:background="?android:attr/selectableItemBackground"
            android:minWidth="80dp" />

        <Button
            android:id="@+id/btn_photo"
            android:layout_width="wrap_content"
            android:layout_height="32dp"
            android:text="Next Photo"
            android:textColor="#a7f3d0"
            android:textSize="11sp"
            android:background="?android:attr/selectableItemBackground"
            android:minWidth="80dp" />
    </LinearLayout>
</LinearLayout>
`;

const WIDGET_INFO_XML = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="80dp"
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
        $: { 'android:name': '.MusicWidgetProvider', 'android:exported': 'true', 'android:label': 'Rare Shot Control' },
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
