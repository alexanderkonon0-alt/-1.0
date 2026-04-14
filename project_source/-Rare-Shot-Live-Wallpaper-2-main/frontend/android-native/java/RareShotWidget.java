package com.rareshot.livewallpaper;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Rare Shot App Widget Provider
 * Provides a home screen widget with music controls.
 */
public class RareShotWidget extends AppWidgetProvider {

    static final String ACTION_PLAY_PAUSE = "com.rareshot.livewallpaper.PLAY_PAUSE";
    static final String ACTION_NEXT = "com.rareshot.livewallpaper.NEXT_STATION";
    static final String ACTION_PREV = "com.rareshot.livewallpaper.PREV_STATION";
    static final String ACTION_NEXT_WALLPAPER = "com.rareshot.livewallpaper.NEXT_WALLPAPER";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_rare_shot);

        SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
        String stationName = prefs.getString("currentStationName", "Drone Zone");
        boolean isPlaying = prefs.getBoolean("isPlaying", false);

        views.setTextViewText(R.id.widget_station_name, stationName);
        views.setImageViewResource(R.id.widget_play_pause_btn,
            isPlaying ? R.drawable.ic_pause : R.drawable.ic_play);

        // Play/Pause button
        Intent playIntent = new Intent(context, RareShotWidget.class);
        playIntent.setAction(ACTION_PLAY_PAUSE);
        PendingIntent playPending = PendingIntent.getBroadcast(context, 0, playIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_play_pause_btn, playPending);

        // Next station button
        Intent nextIntent = new Intent(context, RareShotWidget.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPending = PendingIntent.getBroadcast(context, 1, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_next_btn, nextPending);

        // Prev station button
        Intent prevIntent = new Intent(context, RareShotWidget.class);
        prevIntent.setAction(ACTION_PREV);
        PendingIntent prevPending = PendingIntent.getBroadcast(context, 2, prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_prev_btn, prevPending);

        // Open app when tapping station name
        Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (openAppIntent != null) {
            PendingIntent openPending = PendingIntent.getActivity(context, 3, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_station_name, openPending);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);

        if (ACTION_PLAY_PAUSE.equals(action)) {
            boolean isPlaying = prefs.getBoolean("isPlaying", false);
            prefs.edit().putBoolean("isPlaying", !isPlaying).apply();
        } else if (ACTION_NEXT.equals(action)) {
            int idx = prefs.getInt("stationIndex", 0);
            prefs.edit().putInt("stationIndex", (idx + 1) % 10).apply();
        } else if (ACTION_PREV.equals(action)) {
            int idx = prefs.getInt("stationIndex", 0);
            prefs.edit().putInt("stationIndex", (idx - 1 + 10) % 10).apply();
        }

        // Notify all widgets to update
        AppWidgetManager awm = AppWidgetManager.getInstance(context);
        int[] ids = awm.getAppWidgetIds(
            new android.content.ComponentName(context, RareShotWidget.class));
        for (int id : ids) updateWidget(context, awm, id);
    }
}
