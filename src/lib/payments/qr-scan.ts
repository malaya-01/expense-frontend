import { Capacitor } from "@capacitor/core";
import { isNativeClient } from "@/lib/runtime-platform";
import { parseUpiQr, type ParsedUpiQr } from "@/lib/payments/upi-qr";

export async function scanUpiQrNative(): Promise<string> {
  const { BarcodeScanner, BarcodeFormat } = await import(
    "@capacitor-mlkit/barcode-scanning"
  );
  const permission = await BarcodeScanner.requestPermissions();
  const allowed =
    permission.camera === "granted" || permission.camera === "limited";
  if (!allowed) {
    throw new Error("Camera permission is required to scan a UPI QR.");
  }
  try {
    const available = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available.available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
  } catch {
    // Older Play Services still allow scan() without a pre-install step.
  }
  const { barcodes } = await BarcodeScanner.scan({
    formats: [BarcodeFormat.QrCode],
  });
  const value = barcodes.find((row) => row.rawValue)?.rawValue?.trim();
  if (!value) throw new Error("No QR code found. Try again.");
  return value;
}

export function canUseNativeQrScan(): boolean {
  return isNativeClient() && Capacitor.getPlatform() === "android";
}

export function parseScannedUpiQr(raw: string): ParsedUpiQr {
  return parseUpiQr(raw);
}
