package com.finos.app;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Accepts ACTION_SEND receipts from GPay / gallery / files.
 * Bytes are handed to JS for AI extraction and are not written to app storage.
 */
@CapacitorPlugin(name = "ShareReceipt")
public class ShareReceiptPlugin extends Plugin {
    private static final int MAX_BYTES = 4_000_000;
    private JSObject pending;

    @Override
    public void load() {
        super.load();
        if (getActivity() != null) {
            stashFromIntent(getActivity().getIntent(), false);
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (getActivity() != null && intent != null) {
            getActivity().setIntent(intent);
        }
        stashFromIntent(intent, true);
    }

    @PluginMethod
    public void consumePending(PluginCall call) {
        if (pending != null) {
            JSObject data = pending;
            pending = null;
            call.resolve(data);
            return;
        }
        call.resolve(new JSObject());
    }

    private void stashFromIntent(Intent intent, boolean notify) {
        JSObject data = readShare(intent);
        if (data == null) return;
        pending = data;
        if (notify) {
            notifyListeners("shareReceived", data);
        }
    }

    private JSObject readShare(Intent intent) {
        if (intent == null) return null;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action)) return null;
        Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri == null) return null;
        try {
            String mime = intent.getType();
            if (mime == null || mime.trim().isEmpty()) {
                mime = getContext().getContentResolver().getType(uri);
            }
            String name = queryName(uri);
            if (mime == null || mime.trim().isEmpty() || "application/octet-stream".equals(mime)) {
                if (name != null && name.toLowerCase().endsWith(".pdf")) {
                    mime = "application/pdf";
                } else {
                    mime = "image/jpeg";
                }
            }
            byte[] bytes = readBytes(uri);
            if (bytes == null || bytes.length == 0) return null;
            if (bytes.length > MAX_BYTES) return null;
            JSObject data = new JSObject();
            data.put("name", name);
            data.put("mime_type", mime);
            data.put("data_base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
            return data;
        } catch (Exception error) {
            return null;
        }
    }

    private String queryName(Uri uri) {
        String fallback = "receipt";
        Cursor cursor = null;
        try {
            cursor = getContext().getContentResolver().query(
                uri,
                new String[] { OpenableColumns.DISPLAY_NAME },
                null,
                null,
                null
            );
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0) {
                    String name = cursor.getString(index);
                    if (name != null && !name.trim().isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {
            // fall through
        } finally {
            if (cursor != null) cursor.close();
        }
        return fallback;
    }

    private byte[] readBytes(Uri uri) throws Exception {
        InputStream stream = getContext().getContentResolver().openInputStream(uri);
        if (stream == null) return null;
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[16 * 1024];
        int read;
        int total = 0;
        while ((read = stream.read(buffer)) != -1) {
            total += read;
            if (total > MAX_BYTES) {
                stream.close();
                return null;
            }
            out.write(buffer, 0, read);
        }
        stream.close();
        return out.toByteArray();
    }
}
