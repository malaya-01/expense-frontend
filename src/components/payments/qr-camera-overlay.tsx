"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type QrCameraOverlayProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onScan: (raw: string) => void;
};

export function QrCameraOverlay({
  open,
  title = "Scan UPI QR",
  onClose,
  onScan,
}: QrCameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError("");

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const jsQR = (await import("jsqr")).default;

        const tick = () => {
          if (cancelled) return;
          const current = videoRef.current;
          const canvas = canvasRef.current;
          if (current && canvas && current.readyState >= 2) {
            canvas.width = current.videoWidth;
            canvas.height = current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx && canvas.width > 0) {
              ctx.drawImage(current, 0, 0);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const found = jsQR(image.data, image.width, image.height, {
                inversionAttempts: "dontInvert",
              });
              if (found?.data) {
                onScanRef.current(found.data);
                return;
              }
            }
          }
          frameRef.current = window.requestAnimationFrame(tick);
        };
        frameRef.current = window.requestAnimationFrame(tick);
      } catch {
        setError("Camera is blocked. Allow camera access, or upload a QR image.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  async function onFile(file: File | null) {
    if (!file) return;
    try {
      const jsQR = (await import("jsqr")).default;
      const bitmap = await createImageBitmap(file);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(image.data, image.width, image.height);
      if (!found?.data) {
        setError("No QR code found in that image.");
        return;
      }
      onScanRef.current(found.data);
    } catch {
      setError("Could not read that image.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-sm font-semibold">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close scanner"
          className="inline-flex size-9 items-center justify-center rounded-full bg-white/10"
        >
          <X size={18} />
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-56 w-56 rounded-[18px] border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="space-y-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {error ? <p className="text-center text-xs text-red-200">{error}</p> : (
          <p className="flex items-center justify-center gap-2 text-center text-xs text-white/70">
            <Camera size={14} /> Align the UPI QR inside the frame
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void onFile(event.target.files?.[0] || null)}
        />
        <Button
          variant="secondary"
          className="w-full bg-white text-black hover:bg-white/90"
          onClick={() => fileRef.current?.click()}
        >
          <ImageUp size={16} />
          Upload QR image
        </Button>
      </div>
    </div>
  );
}
