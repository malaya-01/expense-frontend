import { WebPlugin } from "@capacitor/core";
import type { UpiIntentPlugin, UpiPayResult } from "./upi-intent-definitions";

export class UpiIntentWeb extends WebPlugin implements UpiIntentPlugin {
  async pay(options: {
    uri: string;
    vpa?: string;
    p2p?: boolean;
  }): Promise<UpiPayResult> {
    if (typeof window === "undefined") {
      throw this.unavailable("UPI pay is only available in a browser or Android app.");
    }
    const vpa = String(options?.vpa || "").trim();
    if (options?.p2p && vpa && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(vpa).catch(() => undefined);
    }
    const uri = String(options?.uri || "").trim();
    if (!uri && !options?.p2p) throw this.unimplemented("Missing UPI URI.");

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      throw this.unavailable(
        "UPI apps are available on Android. Use the Opal Android app to pay.",
      );
    }

    if (!options?.p2p && uri) window.location.href = uri;
    return { status: "LAUNCHED", raw: vpa || uri, resultCode: null };
  }
}
