package com.rareshot.livewallpaper;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Rare Shot Photo Widget (2x2)
 * Shows current wallpaper thumbnail + next wallpaper button.
 */
public class RareShotPhotoWidget extends AppWidgetProvider {

    static final String ACTION_NEXT_WALLPAPER = "com.rareshot.NEXT_WALLPAPER";

    @Override
    public void onUpdate(Context context, AppWidgetManager awm, int[] ids) {
        for (int id : ids) updateWidget(context, awm, id);
    }

    static void updateWidget(Context context, AppWidgetManager awm, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_photo);
        SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
        String wallpaperName = prefs.getString("currentWallpaperName", "Forest Light");
        int wallpaperCount = prefs.getInt("wallpaperCount", 8);

        views.setTextViewText(R.id.widget_wallpaper_name, wallpaperName);
        views.setTextViewText(R.id.widget_photo_count, wallpaperCount + " photos");

        // Next wallpaper button
        Intent ni = new Intent(context, RareShotPhotoWidget.class).setAction(ACTION_NEXT_WALLPAPER);
        views.setOnClickPendingIntent(R.id.widget_next_wallpaper_btn,
            PendingIntent.getBroadcast(context, 20, ni, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Open Photos tab on root click
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            views.setOnClickPendingIntent(R.id.widget_photo_root,
                PendingIntent.getActivity(context, 21, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }

        awm.updateAppWidget(widgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_NEXT_WALLPAPER.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
            int idx = prefs.getInt("wallpaperIndex", 0);
            int count = prefs.getInt("wallpaperCount", 8);
            prefs.edit().putInt("wallpaperIndex", (idx + 1) % Math.max(count, 1)).apply();
        }
        AppWidgetManager awm = AppWidgetManager.getInstance(context);
        int[] ids = awm.getAppWidgetIds(new android.content.ComponentName(context, RareShotPhotoWidget.class));
        for (int id : ids) updateWidget(context, awm, id);
    }
}
