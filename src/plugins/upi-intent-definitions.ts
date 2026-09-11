export type UpiPayStatus =
  | "SUCCESS"
  | "FAILURE"
  | "SUBMITTED"
  | "CANCELLED"
  | "UNKNOWN";

export type UpiPayResult = {
  status: UpiPayStatus;
  txnId?: string | null;
  responseCode?: string | null;
  approvalRefNo?: string | null;
  raw?: string | null;
  resultCode?: number | null;
};

export type UpiIntentPlugin = {
  pay(options: { uri: string }): Promise<UpiPayResult>;
};
