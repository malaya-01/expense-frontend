import { WebPlugin } from "@capacitor/core";
import type { UpiIntentPlugin, UpiPayResult } from "./upi-intent-definitions";

export class UpiIntentWeb extends WebPlugin implements UpiIntentPlugin {
  async pay(options: { uri: string }): Promise<UpiPayResult> {
    if (typeof window === "undefined") {
      throw this.unavailable("UPI pay is only available in a browser or Android app.");
    }
    const uri = String(options?.uri || "").trim();
    if (!uri) throw this.unimplemented("Missing UPI URI.");

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      throw this.unavailable(
        "UPI apps are available on Android. Use the Opal Android app to pay.",
      );
    }

    // Chrome on Android can hand off to GPay/PhonePe, but cannot return txn status.
    window.location.href = uri;
    return { status: "UNKNOWN", raw: uri, resultCode: null };
  }
}
