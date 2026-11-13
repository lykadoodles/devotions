package com.lykadoodles.lamp;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Shared code for Lamp's home-screen widgets.
 *
 * The app writes a summary (key "lamp.widget") with Capacitor Preferences, which
 * lives in the "CapacitorStorage" shared preferences. Widgets read it and pick
 * today's entry by date, so they stay right after midnight without the app.
 * Ticks made on a widget go to "lamp.widget.actions" for the app to apply.
 */
public final class LampWidgets {
    static final String STORE = "CapacitorStorage";
    static final String KEY = "lamp.widget";
    static final String ACTIONS = "lamp.widget.actions";
    static final String ROUTE = "lamp.widget.route";
    static final String EXTRA_ROUTE = "lampRoute";

    private LampWidgets() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    }

    static JSONObject data(Context c) {
        try {
            String raw = prefs(c).getString(KEY, null);
            return raw == null ? null : new JSONObject(raw);
        } catch (Exception e) {
            return null;
        }
    }

    static void saveData(Context c, JSONObject d) {
        prefs(c).edit().putString(KEY, d.toString()).apply();
    }

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /** Today's entry, or null when the app hasn't written one that far ahead. */
    static JSONObject day(JSONObject d) {
        if (d == null) return null;
        JSONObject days = d.optJSONObject("days");
        return days == null ? null : days.optJSONObject(today());
    }

    /** Opens Lamp on a screen (a "#/..." route, or "add-prayer" / "add-todo"). */
    static PendingIntent open(Context c, String route) {
        Intent i = new Intent(c, MainActivity.class);
        i.putExtra(EXTRA_ROUTE, route);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, ("open:" + route).hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** Queues a change for the app to apply the next time it opens. */
    static void queue(Context c, JSONObject action) {
        try {
            SharedPreferences p = prefs(c);
            JSONArray a = new JSONArray(p.getString(ACTIONS, "[]"));
            a.put(action);
            p.edit().putString(ACTIONS, a.toString()).apply();
        } catch (Exception ignored) {}
    }

    /** One list row: a leading mark, a title and an optional detail. */
    static RemoteViews row(Context c, int mark, String title, String detail, boolean done) {
        RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.lamp_widget_row);
        if (mark == 0) r.setViewVisibility(R.id.w_mark, View.GONE);
        else r.setImageViewResource(R.id.w_mark, mark);
        r.setTextViewText(R.id.w_title, title);
        r.setTextColor(R.id.w_title, done ? 0x99C9D2F0 : 0xFFF3F5FF);
        if (detail == null || detail.isEmpty()) r.setViewVisibility(R.id.w_detail, View.GONE);
        else r.setTextViewText(R.id.w_detail, detail);
        return r;
    }

    static RemoteViews note(Context c, String text) {
        RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.lamp_widget_note);
        r.setTextViewText(R.id.w_note, text);
        return r;
    }

    /** Redraws every Lamp widget on the home screen. */
    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        VerseWidget.draw(c, m, m.getAppWidgetIds(new ComponentName(c, VerseWidget.class)));
        ReadingWidget.draw(c, m, m.getAppWidgetIds(new ComponentName(c, ReadingWidget.class)));
        PrayerWidget.draw(c, m, m.getAppWidgetIds(new ComponentName(c, PrayerWidget.class)));
        TasksWidget.draw(c, m, m.getAppWidgetIds(new ComponentName(c, TasksWidget.class)));
    }
}
