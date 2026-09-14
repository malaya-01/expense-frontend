import { WebPlugin } from "@capacitor/core";
import type {
  ShareReceiptPlugin,
  SharedReceiptPayload,
} from "./share-receipt-definitions";

export class ShareReceiptWeb
  extends WebPlugin
  implements ShareReceiptPlugin
{
  async consumePending(): Promise<SharedReceiptPayload> {
    return {};
  }
}
