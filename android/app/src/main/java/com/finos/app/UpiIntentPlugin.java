package com.finos.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "UpiIntent")
public class UpiIntentPlugin extends Plugin {

    @PluginMethod
    public void pay(PluginCall call) {
        String uri = call.getString("uri");
        if (uri == null || uri.trim().isEmpty()) {
            call.reject("Missing UPI URI");
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(uri.trim()));
            Intent chooser = Intent.createChooser(intent, "Pay with UPI");
            startActivityForResult(call, chooser, "onUpiResult");
        } catch (Exception error) {
            call.reject("Could not open a UPI app: " + error.getMessage());
        }
    }

    @ActivityCallback
    private void onUpiResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        JSObject data = new JSObject();
        int resultCode = result == null ? Activity.RESULT_CANCELED : result.getResultCode();
        data.put("resultCode", resultCode);

        Intent intent = result == null ? null : result.getData();
        Bundle extras = intent == null ? null : intent.getExtras();
        String raw = firstExtra(extras, "response", "Response", "txnInfo");

        if ((raw == null || raw.isEmpty()) && extras != null) {
            StringBuilder builder = new StringBuilder();
            for (String key : extras.keySet()) {
                Object value = extras.get(key);
                if (value == null) continue;
                if (builder.length() > 0) builder.append("&");
                builder.append(key).append("=").append(value);
            }
            raw = builder.toString();
        }

        String status = firstExtra(extras, "Status", "status", "STATUS");
        String txnId = firstExtra(extras, "txnId", "txnID", "txnid", "TxnId");
        String responseCode = firstExtra(extras, "responseCode", "ResponseCode", "responsecode");
        String approvalRef = firstExtra(
            extras,
            "ApprovalRefNo",
            "approvalRefNo",
            "txnRef",
            "TxnRef"
        );

        if (raw != null && !raw.isEmpty()) {
            if (isBlank(status)) status = queryValue(raw, "Status", "status");
            if (isBlank(txnId)) txnId = queryValue(raw, "txnId", "txnID", "txnid");
            if (isBlank(responseCode)) {
                responseCode = queryValue(raw, "responseCode", "ResponseCode");
            }
            if (isBlank(approvalRef)) {
                approvalRef = queryValue(raw, "ApprovalRefNo", "txnRef", "ApprovalRefNo");
            }
        }

        data.put("status", normalizeStatus(status, responseCode, resultCode));
        data.put("txnId", emptyToNull(txnId));
        data.put("responseCode", emptyToNull(responseCode));
        data.put("approvalRefNo", emptyToNull(approvalRef));
        data.put("raw", emptyToNull(raw));
        call.resolve(data);
    }

    private static String normalizeStatus(String status, String responseCode, int resultCode) {
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if ("SUCCESS".equals(normalized) || "SUCCEEDED".equals(normalized) || "S".equals(normalized)) {
            return "SUCCESS";
        }
        if ("FAILURE".equals(normalized) || "FAILED".equals(normalized) || "F".equals(normalized)) {
            return "FAILURE";
        }
        if ("SUBMITTED".equals(normalized) || "PENDING".equals(normalized)) {
            return "SUBMITTED";
        }
        if ("CANCELLED".equals(normalized) || "CANCELED".equals(normalized)) {
            return "CANCELLED";
        }
        if ("00".equals(responseCode) || "0".equals(responseCode)) {
            return "SUCCESS";
        }
        if (resultCode == Activity.RESULT_OK && !isBlank(status)) {
            return "UNKNOWN";
        }
        if (resultCode == Activity.RESULT_CANCELED) {
            return "CANCELLED";
        }
        return "UNKNOWN";
    }

    private static String firstExtra(Bundle extras, String... keys) {
        if (extras == null) return null;
        for (String key : keys) {
            Object value = extras.get(key);
            if (value != null) {
                String text = String.valueOf(value).trim();
                if (!text.isEmpty() && !"null".equalsIgnoreCase(text)) return text;
            }
        }
        return null;
    }

    private static String queryValue(String raw, String... keys) {
        String[] parts = raw.replace(";", "&").split("[&\\n]");
        for (String part : parts) {
            int idx = part.indexOf("=");
            if (idx <= 0) continue;
            String key = part.substring(0, idx).trim();
            String value = part.substring(idx + 1).trim();
            for (String wanted : keys) {
                if (key.equalsIgnoreCase(wanted) && !value.isEmpty()) return value;
            }
        }
        return null;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static String emptyToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }
}
