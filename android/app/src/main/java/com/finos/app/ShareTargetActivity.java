package com.finos.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * Receives ACTION_SEND from other apps and forwards it to MainActivity in
 * Opal's own task. Without this hop the share sheet launches Opal inside the
 * sharing app's task: Opal then vanishes from recents and reopening the
 * sharing app shows Opal instead of where the user left off.
 */
public class ShareTargetActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent source = getIntent();
        if (source != null) {
            Intent forward = new Intent(source);
            forward.setClass(this, MainActivity.class);
            // Re-grant read access so MainActivity can open the shared URI
            // after this activity (the original grant holder) finishes.
            forward.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
            try {
                startActivity(forward);
            } catch (Exception ignored) {
                // Nothing useful to do; just don't leave a blank activity behind.
            }
        }
        finish();
        overridePendingTransition(0, 0);
    }
}
