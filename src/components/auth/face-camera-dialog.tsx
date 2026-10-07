"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { FaceHalo } from "@/components/auth/face-halo";
import {
  assessFace,
  averageDescriptors,
  descriptorsAgree,
  loadFaceEngine,
  readFaceFromVideo,
  type FaceSample,
} from "@/lib/face-login/engine";

const ENROLL_SAMPLES = 3;
const ENROLL_FORCE_AT = 5;
const VERIFY_HITS = 2;

export type FaceEnrollment = {
  descriptor: number[];
  preview: string;
};

type Stage = "intro" | "scan" | "done";

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function snapshot(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  const side = 320;
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const vw = video.videoWidth || side;
  const vh = video.videoHeight || side;
  const crop = Math.min(vw, vh);
  const sx = (vw - crop) / 2;
  const sy = (vh - crop) / 2;
  ctx.translate(side, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, crop, crop, 0, 0, side, side);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 720 },
      },
    },
    { audio: false, video: true },
  ];
  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Could not open the camera.");
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Allow camera access, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not start the camera.";
}

export function FaceCameraDialog({
  open,
  mode,
  onClose,
  onEnrolled,
  onVerified,
}: {
  open: boolean;
  mode: "enroll" | "verify";
  onClose: () => void;
  onEnrolled?: (result: FaceEnrollment) => void | Promise<void>;
  onVerified?: (descriptor: number[]) => void | Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runRef = useRef(0);
  const samplesRef = useRef<Float32Array[]>([]);
  const missesRef = useRef(0);
  const doneRef = useRef(false);
  const modeRef = useRef(mode);
  const onEnrolledRef = useRef(onEnrolled);
  const onVerifiedRef = useRef(onVerified);
  modeRef.current = mode;
  onEnrolledRef.current = onEnrolled;
  onVerifiedRef.current = onVerified;

  const [stage, setStage] = useState<Stage>(mode === "enroll" ? "intro" : "scan");
  const [hint, setHint] = useState("Look at the camera");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState("");
  const [pending, setPending] = useState<FaceEnrollment | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [confident, setConfident] = useState(false);

  const release = useCallback(() => {
    runRef.current += 1;
    stopStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      release();
      return;
    }
    setStage(mode === "enroll" ? "intro" : "scan");
    setError("");
    setPreview("");
    setPending(null);
    setHint("Look at the camera");
    setSaving(false);
    setConfident(false);
  }, [open, mode, release]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const attachVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (!open || stage !== "scan" || !node) return;
      const runId = runRef.current + 1;
      runRef.current = runId;
      samplesRef.current = [];
      missesRef.current = 0;
      doneRef.current = false;
      setError("");
      setHint("Starting the camera…");

      void (async () => {
        try {
          if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("This browser cannot use the camera.");
          }
          const stream = await openCamera();
          if (runRef.current !== runId) {
            stopStream(stream);
            return;
          }
          streamRef.current = stream;
          node.srcObject = stream;
          await node.play();
          setHint("Loading face recognition…");
          await loadFaceEngine();
          if (runRef.current !== runId) return;
          setHint(
            modeRef.current === "enroll"
              ? "Hold still"
              : "Look at the camera to sign in",
          );

          let lastTick = 0;
          let busy = false;
          const tick = async (now: number) => {
            if (runRef.current !== runId || doneRef.current) return;
            if (now - lastTick >= 220 && !busy) {
              lastTick = now;
              busy = true;
              try {
                await scanFrame(node, runId);
              } catch (scanError) {
                if (runRef.current === runId) {
                  setError(cameraErrorMessage(scanError));
                }
              } finally {
                busy = false;
              }
            }
            if (runRef.current === runId && !doneRef.current) {
              window.requestAnimationFrame((time) => {
                void tick(time);
              });
            }
          };
          window.requestAnimationFrame((time) => {
            void tick(time);
          });
        } catch (startError) {
          if (runRef.current !== runId) return;
          setError(cameraErrorMessage(startError));
        }
      })();
    },
    [open, stage, attempt],
  );

  async function scanFrame(video: HTMLVideoElement, runId: number) {
    const sample = await readFaceFromVideo(video);
    if (runRef.current !== runId || doneRef.current) return;
    if (!sample) {
      missesRef.current += 1;
      if (missesRef.current > 3) {
        samplesRef.current = [];
        setHint("Center your face in the circle");
      }
      return;
    }
    const quality = assessFace(sample, video);
    if (!quality.ok) {
      missesRef.current += 1;
      if (missesRef.current > 2) {
        samplesRef.current = [];
      }
      setHint(quality.hint);
      return;
    }
    missesRef.current = 0;
    if (modeRef.current === "enroll") {
      acceptEnrollmentSample(sample, video, runId);
      return;
    }
    acceptVerifySample(sample, runId);
  }

  function acceptEnrollmentSample(
    sample: FaceSample,
    video: HTMLVideoElement,
    runId: number,
  ) {
    const next = samplesRef.current.concat(sample.descriptor);
    samplesRef.current = next.length > ENROLL_FORCE_AT ? next.slice(-ENROLL_FORCE_AT) : next;
    const count = samplesRef.current.length;
    setConfident(true);
    if (count < ENROLL_SAMPLES) {
      setHint(`Hold still (${count} of ${ENROLL_SAMPLES})`);
      return;
    }
    const recent = samplesRef.current.slice(-ENROLL_SAMPLES);
    const stable = descriptorsAgree(recent);
    if (!stable && count < ENROLL_FORCE_AT) {
      setHint(`Hold still (${count} of ${ENROLL_FORCE_AT})`);
      return;
    }
    doneRef.current = true;
    if (runRef.current !== runId) return;
    const chosen = stable ? averageDescriptors(recent) : sample.descriptor;
    const still = snapshot(video);
    release();
    setPreview(still);
    setPending({ descriptor: Array.from(chosen), preview: still });
    setStage("done");
  }

  function acceptVerifySample(sample: FaceSample, runId: number) {
    const next = samplesRef.current.concat(sample.descriptor);
    samplesRef.current = next.length > 4 ? next.slice(-4) : next;
    setConfident(true);
    setHint("Hold still");
    const recent = samplesRef.current.slice(-VERIFY_HITS);
    if (samplesRef.current.length < VERIFY_HITS) return;
    if (!descriptorsAgree(recent, 0.45) && samplesRef.current.length < 4) {
      return;
    }
    doneRef.current = true;
    if (runRef.current !== runId) return;
    const descriptor = Array.from(averageDescriptors(recent));
    release();
    void onVerifiedRef.current?.(descriptor);
  }

  async function confirmEnrollment() {
    if (!pending) return;
    setSaving(true);
    setError("");
    try {
      await onEnrolledRef.current?.(pending);
    } catch (saveError) {
      setError(cameraErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  if (!open || !mounted) return null;

  const scanning = stage === "scan";
  const haloTone = stage === "done" ? "green" : "rainbow";

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black text-white">
      <div className="flex items-center px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-10 items-center justify-center rounded-full text-white/90"
          aria-label="Close"
        >
          <X size={22} />
        </button>
      </div>

      {stage === "intro" ? (
        <div className="flex min-h-0 flex-1 flex-col px-8 pb-[max(24px,env(safe-area-inset-bottom))]">
          <h2 className="text-center text-[28px] font-semibold tracking-[-0.03em]">
            Enrol face
          </h2>
          <p className="mx-auto mt-3 max-w-[340px] text-center text-[15px] leading-6 text-white/70">
            For best results, hold the device 20 cm to 50 cm from your face in
            an environment that is neither too bright nor too dim.
          </p>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative size-[280px]">
              <FaceHalo tone="rainbow" />
              <div
                className="absolute left-1/2 top-1/2 size-[148px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 38% 32%, #b8ffe4 0%, #67d7ff 28%, #6a7bff 58%, #c46bff 100%)",
                }}
              >
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <circle cx="34" cy="42" r="3.2" fill="#24143f" />
                  <circle cx="66" cy="42" r="3.2" fill="#24143f" />
                  <path
                    d="M50 46 v12"
                    stroke="#24143f"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M36 64 Q50 76 64 64"
                    stroke="#24143f"
                    strokeWidth="2.6"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
          <p className="mx-auto mb-5 max-w-[360px] text-center text-[13px] leading-5 text-white/55">
            By tapping Continue, you agree that a face template is encrypted
            and stored with your account so you can sign in on the web and the
            phone.
          </p>
          <button
            type="button"
            onClick={() => setStage("scan")}
            className="mx-auto mb-2 h-12 w-full max-w-[420px] rounded-full bg-[#2f6bff] text-[17px] font-medium text-white"
          >
            Continue
          </button>
        </div>
      ) : null}

      {scanning ? (
        <div className="flex min-h-0 flex-1 flex-col items-center px-6 pb-[max(24px,env(safe-area-inset-bottom))]">
          <h2 className="text-center text-[26px] font-semibold tracking-[-0.03em]">
            {mode === "enroll" ? "Enrol face" : "Face login"}
          </h2>
          <p className="mt-2 max-w-[320px] text-center text-[14px] leading-5 text-white/70">
            {error || hint}
          </p>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative size-[300px]">
              <FaceHalo tone={confident ? "green" : "rainbow"} />
              <div className="absolute left-1/2 top-1/2 size-[210px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-black">
                <video
                  key={attempt}
                  ref={attachVideo}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
              </div>
            </div>
          </div>
          {error ? (
            <button
              type="button"
              onClick={() => {
                release();
                setAttempt((value) => value + 1);
              }}
              className="mb-2 h-12 w-full max-w-[420px] rounded-full bg-[#2f6bff] text-[17px] font-medium"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}

      {stage === "done" ? (
        <div className="flex min-h-0 flex-1 flex-col px-8 pb-[max(24px,env(safe-area-inset-bottom))]">
          <h2 className="mx-auto max-w-[360px] text-center text-[26px] font-semibold leading-8 tracking-[-0.03em]">
            All set! You can now sign in with your face.
          </h2>
          <div className="flex flex-1 items-center justify-center">
            <div className="relative size-[300px]">
              <FaceHalo tone={haloTone} />
              <div className="absolute left-1/2 top-1/2 size-[210px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-black">
                {preview ? (
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg viewBox="0 0 80 80" className="size-24 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                    <path
                      d="M18 42 L34 58 L64 24"
                      fill="none"
                      stroke="#3dff6a"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </div>
          <p className="mb-5 flex items-center justify-center gap-2 text-center text-[13px] text-white/70">
            <ShieldCheck size={16} className="text-[#7aa2ff]" />
            Facial data is encrypted when stored.
          </p>
          {error ? (
            <p className="mb-3 text-center text-[13px] text-[#ff8d8d]">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={saving || !pending}
            onClick={() => void confirmEnrollment()}
            className="mx-auto mb-2 h-12 w-full max-w-[420px] rounded-full bg-[#2f6bff] text-[17px] font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Done"}
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
