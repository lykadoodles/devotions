package com.lykadoodles.lamp;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Lets the app tell the home-screen widgets that their summary changed. */
@CapacitorPlugin(name = "LampWidgets")
public class LampWidgetsPlugin extends Plugin {
    @PluginMethod
    public void refresh(PluginCall call) {
        LampWidgets.updateAll(getContext());
        call.resolve();
    }
}
