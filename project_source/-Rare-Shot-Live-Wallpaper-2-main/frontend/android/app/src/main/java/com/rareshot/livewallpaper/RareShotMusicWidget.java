package com.rareshot.livewallpaper;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Rare Shot Music Widget (4x1)
 * Displays current radio station + play/pause/next/prev controls.
 */
public class RareShotMusicWidget extends AppWidgetProvider {

    static final String ACTION_PLAY_PAUSE = "com.rareshot.MUSIC_PLAY_PAUSE";
    static final String ACTION_NEXT = "com.rareshot.MUSIC_NEXT";
    static final String ACTION_PREV = "com.rareshot.MUSIC_PREV";

    @Override
    public void onUpdate(Context context, AppWidgetManager awm, int[] ids) {
        for (int id : ids) updateWidget(context, awm, id);
    }

    static void updateWidget(Context context, AppWidgetManager awm, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_music);
        SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
        String stationName = prefs.getString("currentStationName", "Drone Zone");
        boolean playing = prefs.getBoolean("isPlaying", false);

        views.setTextViewText(R.id.widget_station_name, stationName);
        views.setImageViewResource(R.id.widget_play_pause_btn,
            playing ? R.drawable.ic_pause : R.drawable.ic_play);

        // Play/Pause
        Intent pi = new Intent(context, RareShotMusicWidget.class).setAction(ACTION_PLAY_PAUSE);
        views.setOnClickPendingIntent(R.id.widget_play_pause_btn,
            PendingIntent.getBroadcast(context, 10, pi, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Next
        Intent ni = new Intent(context, RareShotMusicWidget.class).setAction(ACTION_NEXT);
        views.setOnClickPendingIntent(R.id.widget_next_btn,
            PendingIntent.getBroadcast(context, 11, ni, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Prev
        Intent pri = new Intent(context, RareShotMusicWidget.class).setAction(ACTION_PREV);
        views.setOnClickPendingIntent(R.id.widget_prev_btn,
            PendingIntent.getBroadcast(context, 12, pri, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Open app on icon click
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            views.setOnClickPendingIntent(R.id.widget_icon,
                PendingIntent.getActivity(context, 13, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }

        awm.updateAppWidget(widgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
        String action = intent.getAction();
        if (action == null) return;

        if (ACTION_PLAY_PAUSE.equals(action)) {
            prefs.edit().putBoolean("isPlaying", !prefs.getBoolean("isPlaying", false)).apply();
        } else if (ACTION_NEXT.equals(action)) {
            int idx = prefs.getInt("stationIndex", 0);
            prefs.edit().putInt("stationIndex", (idx + 1) % 10).apply();
        } else if (ACTION_PREV.equals(action)) {
            int idx = prefs.getInt("stationIndex", 0);
            prefs.edit().putInt("stationIndex", (idx - 1 + 10) % 10).apply();
        }

        AppWidgetManager awm = AppWidgetManager.getInstance(context);
        int[] ids = awm.getAppWidgetIds(new android.content.ComponentName(context, RareShotMusicWidget.class));
        for (int id : ids) updateWidget(context, awm, id);
    }
}
