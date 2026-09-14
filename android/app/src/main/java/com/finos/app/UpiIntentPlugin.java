package com.finos.app;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Personal UPI (@ok* / no merchant code): copy VPA and open Google Pay's
 * home screen. Do NOT send upi://pay — GPay treats every third-party
 * pay intent as a merchant transaction and banks reject even ₹1.
 * pay intent as a merchant transaction and reject even ₹1.
 *
 * Merchant QRs (have mc): open upi://pay without startActivityForResult.
 */
@CapacitorPlugin(name = "UpiIntent")
public class UpiIntentPlugin extends Plugin {

    private static final String GPAY = "com.google.android.apps.nbu.paisa.user";
    private static final String PHONEPE = "com.phonepe.app";
    private static final String PAYTM = "net.one97.paytm";
    private static final String BHIM = "in.org.npci.upiapp";

    @PluginMethod
    public void pay(PluginCall call) {
        boolean p2p = Boolean.TRUE.equals(call.getBoolean("p2p", false));
        String vpa = call.getString("vpa");
        String uri = call.getString("uri");

        try {
            if (p2p) {
                if (vpa != null && !vpa.trim().isEmpty()) {
                    copyText(vpa.trim());
                }
                if (!openAppHome(GPAY) && !openAppHome(PHONEPE) && !openAppHome(PAYTM) && !openAppHome(BHIM)) {
                    call.reject("No UPI app found. Install Google Pay and try again.");
                    return;
                }
                JSObject data = new JSObject();
                data.put("status", "LAUNCHED");
                data.put("raw", vpa);
                call.resolve(data);
                return;
            }

            if (uri == null || uri.trim().isEmpty()) {
                call.reject("Missing UPI URI");
                return;
            }
            Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(uri.trim()));
            view.addCategory(Intent.CATEGORY_DEFAULT);
            getActivity().startActivity(view);

            JSObject data = new JSObject();
            data.put("status", "LAUNCHED");
            data.put("raw", uri.trim());
            call.resolve(data);
        } catch (Exception error) {
            call.reject("Could not open a UPI app: " + error.getMessage());
        }
    }

    private void copyText(String text) {
        ClipboardManager clipboard =
            (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard == null) return;
        clipboard.setPrimaryClip(ClipData.newPlainText("UPI ID", text));
    }

    private boolean openAppHome(String packageName) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent launch = pm.getLaunchIntentForPackage(packageName);
            if (launch == null) return false;
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(launch);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}
