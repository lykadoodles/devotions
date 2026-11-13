package com.lykadoodles.lamp;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** The prayer list; + opens Lamp ready to write a new prayer. */
public class PrayerWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        draw(c, m, ids);
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        if (ids == null || ids.length == 0) return;
        JSONObject d = LampWidgets.data(c);
        for (int id : ids) {
            RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.lamp_widget_list);
            r.setTextViewText(R.id.w_head, "PRAYER LIST");
            r.setOnClickPendingIntent(R.id.w_head, LampWidgets.open(c, "#/prayer"));
            r.setViewVisibility(R.id.w_add, View.VISIBLE);
            r.setOnClickPendingIntent(R.id.w_add, LampWidgets.open(c, "add-prayer"));
            r.removeAllViews(R.id.w_list);
            JSONArray ps = d == null ? null : d.optJSONArray("prayers");
            int count = d == null ? 0 : d.optInt("prayerCount");
            r.setTextViewText(R.id.w_sub, count > 0 ? String.valueOf(count) : "");
            if (ps == null || ps.length() == 0) {
                r.addView(R.id.w_list, LampWidgets.note(c, d == null ? "Open Lamp once to set up this widget." : "Tap + to add a prayer request."));
            } else {
                for (int i = 0; i < ps.length(); i++) {
                    JSONObject p = ps.optJSONObject(i);
                    if (p == null) continue;
                    String who = p.optString("who");
                    RemoteViews row = LampWidgets.row(c, R.drawable.lamp_w_dot, p.optString("text"), who.isEmpty() ? "" : "for " + who, false);
                    row.setOnClickPendingIntent(R.id.w_row, LampWidgets.open(c, "#/prayer"));
                    r.addView(R.id.w_list, row);
                }
            }
            m.updateAppWidget(id, r);
        }
    }
}
