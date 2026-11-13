package com.lykadoodles.lamp;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Verse of the day, with a share button. Tapping it opens Today. */
public class VerseWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        draw(c, m, ids);
    }

    static void draw(Context c, AppWidgetManager m, int[] ids) {
        if (ids == null || ids.length == 0) return;
        JSONObject day = LampWidgets.day(LampWidgets.data(c));
        JSONObject v = day == null ? null : day.optJSONObject("verse");
        for (int id : ids) {
            RemoteViews r = new RemoteViews(c.getPackageName(), R.layout.lamp_widget_verse);
            r.setOnClickPendingIntent(R.id.w_root, LampWidgets.open(c, "#/today"));
            if (v == null || v.optString("text").isEmpty()) {
                r.setTextViewText(R.id.w_ref, v == null ? "Open Lamp" : v.optString("ref"));
                r.setTextViewText(R.id.w_text, "Open Lamp once to load today’s verse.");
                r.setViewVisibility(R.id.w_tr, View.GONE);
                r.setViewVisibility(R.id.w_share, View.GONE);
            } else {
                String ref = v.optString("ref"), text = v.optString("text"), tr = v.optString("tr");
                r.setTextViewText(R.id.w_ref, ref);
                r.setTextViewText(R.id.w_text, text);
                r.setTextViewText(R.id.w_tr, tr);
                r.setViewVisibility(R.id.w_tr, tr.isEmpty() ? View.GONE : View.VISIBLE);
                r.setViewVisibility(R.id.w_share, View.VISIBLE);
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_TEXT, "“" + text + "”\n— " + ref + (tr.isEmpty() ? "" : " (" + tr + ")"));
                Intent chooser = Intent.createChooser(send, "Share verse");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                r.setOnClickPendingIntent(R.id.w_share, PendingIntent.getActivity(c, ("share:" + ref).hashCode(), chooser,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            m.updateAppWidget(id, r);
        }
    }
}
