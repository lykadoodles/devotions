package com.lykadoodles.lamp;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

/**
 * Lamp's main screen. Adds the widgets plugin, and opens the screen a widget
 * was tapped for: on a cold start the route waits in storage for the app to
 * read; when Lamp is already open it's handed straight to the page.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LampWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
        keepRoute(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String route = intent == null ? null : intent.getStringExtra(LampWidgets.EXTRA_ROUTE);
        if (route == null) return;
        intent.removeExtra(LampWidgets.EXTRA_ROUTE);
        try {
            String js = "(function(){if(window.lampOpen){window.lampOpen(" + org.json.JSONObject.quote(route) + ");return 'ok';}return 'no';})()";
            getBridge().getWebView().evaluateJavascript(js, (value) -> {
                if (value == null || !value.contains("ok")) LampWidgets.prefs(this).edit().putString(LampWidgets.ROUTE, route).apply();
            });
        } catch (Exception e) {
            LampWidgets.prefs(this).edit().putString(LampWidgets.ROUTE, route).apply();
        }
    }

    private void keepRoute(Intent intent) {
        String route = intent == null ? null : intent.getStringExtra(LampWidgets.EXTRA_ROUTE);
        if (route == null) return;
        intent.removeExtra(LampWidgets.EXTRA_ROUTE);
        LampWidgets.prefs(this).edit().putString(LampWidgets.ROUTE, route).apply();
    }
}
