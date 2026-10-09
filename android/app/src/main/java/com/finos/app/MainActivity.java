package com.finos.app;

import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.ViewGroup.MarginLayoutParams;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpiIntentPlugin.class);
        registerPlugin(ShareReceiptPlugin.class);
        super.onCreate(savedInstanceState);
        keepWebViewAboveKeyboard();
    }

    /**
     * Android 15+ forces edge-to-edge, so adjustResize no longer shrinks the
     * window when the keyboard opens and inputs end up hidden behind it.
     * Capacitor's "auto" edge-to-edge margins only cover the system bars;
     * replace its listener with one that also reserves the IME height.
     */
    private void keepWebViewAboveKeyboard() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return;
        if (bridge == null) return;
        WebView webView = bridge.getWebView();
        if (webView == null) return;

        TypedValue value = new TypedValue();
        boolean foundOptOut = getTheme().resolveAttribute(android.R.attr.windowOptOutEdgeToEdgeEnforcement, value, true);
        if (foundOptOut && value.data != 0) return;

        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            MarginLayoutParams mlp = (MarginLayoutParams) v.getLayoutParams();
            mlp.leftMargin = bars.left;
            mlp.topMargin = bars.top;
            mlp.rightMargin = bars.right;
            mlp.bottomMargin = Math.max(bars.bottom, ime.bottom);
            v.setLayoutParams(mlp);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
