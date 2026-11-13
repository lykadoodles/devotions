package com.lykadoodles.lamp;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/** Today's four readings with what's done; each opens its reading. */
public class ReadingWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        draw(c, m, ids);
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        if (ids == null || ids.length == 0) return;
        JSONObject d = LampWidgets.data(c);
        JSONObject day = LampWidgets.day(d);
        for (int id : ids) {
            RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.lamp_widget_list);
            r.setTextViewText(R.id.w_head, "TODAY’S READING");
            r.setOnClickPendingIntent(R.id.w_head, LampWidgets.open(c, "#/today"));
            r.setViewVisibility(R.id.w_add, android.view.View.GONE);
            r.removeAllViews(R.id.w_list);
            if (day == null) {
                r.setTextViewText(R.id.w_sub, "");
                r.addView(R.id.w_list, LampWidgets.note(c, "Open Lamp once to load today’s readings."));
            } else {
                int n = day.optInt("day"), s = d.optInt("streak");
                StringBuilder sub = new StringBuilder();
                if (n > 0) sub.append("Day ").append(n);
                if (s > 0) sub.append(sub.length() > 0 ? " · " : "").append("🔥 ").append(s);
                r.setTextViewText(R.id.w_sub, sub.toString());
                JSONArray rs = day.optJSONArray("readings");
                int done = 0;
                for (int i = 0; rs != null && i < rs.length(); i++) {
                    JSONObject x = rs.optJSONObject(i);
                    if (x == null) continue;
                    boolean ok = x.optBoolean("done");
                    if (ok) done++;
                    RemoteViews row = LampWidgets.row(c, ok ? R.drawable.lamp_w_check : R.drawable.lamp_w_circle,
                            x.optString("ref"), x.optString("name"), ok);
                    row.setOnClickPendingIntent(R.id.w_row, LampWidgets.open(c, x.optString("route", "#/today")));
                    r.addView(R.id.w_list, row);
                }
                if (rs != null && rs.length() > 0 && done == rs.length())
                    r.addView(R.id.w_list, LampWidgets.note(c, "Today’s lamp is full ✨"));
            }
            m.updateAppWidget(id, r);
        }
    }
}
