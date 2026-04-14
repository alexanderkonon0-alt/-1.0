package com.rareshot.livewallpaper;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Rare Shot Effects Widget (2x1)
 * Toggle particle effects on/off and cycle through effect types.
 */
public class RareShotEffectsWidget extends AppWidgetProvider {

    static final String ACTION_NEXT_EFFECT = "com.rareshot.NEXT_EFFECT";

    @Override
    public void onUpdate(Context context, AppWidgetManager awm, int[] ids) {
        for (int id : ids) updateWidget(context, awm, id);
    }

    static void updateWidget(Context context, AppWidgetManager awm, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_effects);
        SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
        int effectIdx = prefs.getInt("activeEffectIndex", 3);
        String[] names = { "Off", "Rain", "Snow", "Leaves", "Sparks", "Bubbles", "Stars", "Petals" };

        views.setTextViewText(R.id.widget_effect_name, names[effectIdx % names.length]);

        Intent ti = new Intent(context, RareShotEffectsWidget.class).setAction(ACTION_NEXT_EFFECT);
        views.setOnClickPendingIntent(R.id.widget_effect_toggle_btn,
            PendingIntent.getBroadcast(context, 30, ti, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            views.setOnClickPendingIntent(R.id.widget_effects_root,
                PendingIntent.getActivity(context, 31, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }

        awm.updateAppWidget(widgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_NEXT_EFFECT.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences("RareShotPrefs", Context.MODE_PRIVATE);
            int idx = prefs.getInt("activeEffectIndex", 3);
            prefs.edit().putInt("activeEffectIndex", (idx + 1) % 8).apply();
        }
        AppWidgetManager awm = AppWidgetManager.getInstance(context);
        int[] ids = awm.getAppWidgetIds(new android.content.ComponentName(context, RareShotEffectsWidget.class));
        for (int id : ids) updateWidget(context, awm, id);
    }
}
