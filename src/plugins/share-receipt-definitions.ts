export type SharedReceiptPayload = {
  name?: string;
  mime_type?: string;
  data_base64?: string;
};

export interface ShareReceiptPlugin {
  consumePending(): Promise<SharedReceiptPayload>;
  addListener(
    eventName: "shareReceived",
    listenerFunc: (payload: SharedReceiptPayload) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}
