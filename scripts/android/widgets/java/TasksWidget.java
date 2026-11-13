package com.lykadoodles.lamp;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Planner to-dos: today's scheduled items, then open to-dos. The circle ticks
 * an item right on the home screen (Lamp applies it when it next opens);
 * + opens Lamp to add one.
 */
public class TasksWidget extends AppWidgetProvider {
    static final String TOGGLE = "com.lykadoodles.lamp.widget.TOGGLE";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        draw(c, m, ids);
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        if (!TOGGLE.equals(intent.getAction())) return;
        String id = intent.getStringExtra("id");
        boolean done = intent.getBooleanExtra("done", true);
        if (id == null) return;
        JSONObject d = LampWidgets.data(c);
        if (d != null) {
            mark(d.optJSONObject("planner") == null ? null : d.optJSONObject("planner").optJSONArray("todos"), id, done);
            JSONObject days = d.optJSONObject("days");
            if (days != null) {
                for (java.util.Iterator<String> k = days.keys(); k.hasNext(); ) {
                    JSONObject day = days.optJSONObject(k.next());
                    if (day != null) mark(day.optJSONArray("plan"), id, done);
                }
            }
            LampWidgets.saveData(c, d);
        }
        try {
            JSONObject a = new JSONObject();
            a.put("type", "todo");
            a.put("id", id);
            a.put("done", done);
            LampWidgets.queue(c, a);
        } catch (Exception ignored) {}
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        draw(c, m, m.getAppWidgetIds(new android.content.ComponentName(c, TasksWidget.class)));
    }

    private static void mark(JSONArray list, String id, boolean done) {
        for (int i = 0; list != null && i < list.length(); i++) {
            JSONObject x = list.optJSONObject(i);
            if (x != null && id.equals(x.optString("id"))) {
                try { x.put("done", done); } catch (Exception ignored) {}
            }
        }
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        if (ids == null || ids.length == 0) return;
        JSONObject d = LampWidgets.data(c);
        JSONObject day = LampWidgets.day(d);
        JSONObject planner = d == null ? null : d.optJSONObject("planner");
        for (int id : ids) {
            RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.lamp_widget_list);
            r.setTextViewText(R.id.w_head, "TO-DO");
            r.setTextViewText(R.id.w_sub, "");
            r.setOnClickPendingIntent(R.id.w_head, LampWidgets.open(c, "#/planner"));
            r.removeAllViews(R.id.w_list);
            if (planner == null || !planner.optBoolean("on")) {
                r.setViewVisibility(R.id.w_add, View.GONE);
                r.addView(R.id.w_list, LampWidgets.note(c, d == null ? "Open Lamp once to set up this widget."
                        : "Turn on the Planner in Lamp’s Settings to see your to-dos here."));
                r.setOnClickPendingIntent(R.id.w_list, LampWidgets.open(c, "#/settings"));
                m.updateAppWidget(id, r);
                continue;
            }
            r.setViewVisibility(R.id.w_add, View.VISIBLE);
            r.setOnClickPendingIntent(R.id.w_add, LampWidgets.open(c, "add-todo"));
            int shown = 0;
            JSONArray plan = day == null ? null : day.optJSONArray("plan");
            for (int i = 0; plan != null && i < plan.length(); i++) {
                JSONObject x = plan.optJSONObject(i);
                if (x == null) continue;
                r.addView(R.id.w_list, item(c, x, x.optString("time")));
                shown++;
            }
            JSONArray todos = planner.optJSONArray("todos");
            for (int i = 0; todos != null && i < todos.length(); i++) {
                JSONObject x = todos.optJSONObject(i);
                if (x == null) continue;
                r.addView(R.id.w_list, item(c, x, ""));
                shown++;
            }
            if (shown == 0) r.addView(R.id.w_list, LampWidgets.note(c, "Nothing to do. Tap + to add a to-do."));
            m.updateAppWidget(id, r);
        }
    }

    private static RemoteViews item(Context c, JSONObject x, String detail) {
        boolean done = x.optBoolean("done");
        String id = x.optString("id");
        RemoteViews row = LampWidgets.row(c, done ? R.drawable.lamp_w_check : R.drawable.lamp_w_circle, x.optString("text"), detail, done);
        Intent t = new Intent(c, TasksWidget.class);
        t.setAction(TOGGLE);
        t.putExtra("id", id);
        t.putExtra("done", !done);
        row.setOnClickPendingIntent(R.id.w_mark, PendingIntent.getBroadcast(c, ("tick:" + id + ":" + !done).hashCode(), t,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        row.setOnClickPendingIntent(R.id.w_row, LampWidgets.open(c, "#/planner"));
        return row;
    }
}
