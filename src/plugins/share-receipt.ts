import { registerPlugin } from "@capacitor/core";
import type { ShareReceiptPlugin } from "./share-receipt-definitions";

export type {
  ShareReceiptPlugin,
  SharedReceiptPayload,
} from "./share-receipt-definitions";

export const ShareReceipt = registerPlugin<ShareReceiptPlugin>("ShareReceipt", {
  web: () =>
    import("./share-receipt.web").then((mod) => new mod.ShareReceiptWeb()),
});
