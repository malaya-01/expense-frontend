import { registerPlugin } from "@capacitor/core";
import type { UpiIntentPlugin } from "./upi-intent-definitions";

export type {
  UpiIntentPlugin,
  UpiPayResult,
  UpiPayStatus,
} from "./upi-intent-definitions";

export const UpiIntent = registerPlugin<UpiIntentPlugin>("UpiIntent", {
  web: () => import("./upi-intent.web").then((mod) => new mod.UpiIntentWeb()),
});
