"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanFace } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  FACE_MATCH_DISTANCE,
  assessFace,
  averageDescriptors,
  descriptorDistance,
  descriptorsAgree,
  loadFaceEngine,
  readFaceFromVideo,
  type FaceSample,
} from "@/lib/face-login/engine";

const ENROLL_SAMPLES = 3;
/** Save anyway after this many clear frames so a steady face cannot sit forever. */
const ENROLL_FORCE_AT = 5;
const VERIFY_HITS = 2;

export type FaceEnrollment = {
  descriptor: number[];
  preview: string;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function snapshot(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  const scale = 160 / (video.videoWidth || 160);
  canvas.width = 160;
  canvas.height = Math.max(1, Math.round((video.videoHeight || 160) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
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
    return "Allow camera access, then try again. Face login uses this device’s camera.";
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
  savedDescriptor,
  onClose,
  onEnrolled,
  onVerified,
}: {
  open: boolean;
  mode: "enroll" | "verify";
  savedDescriptor?: number[];
  onClose: () => void;
  onEnrolled?: (result: FaceEnrollment) => void;
  onVerified?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runRef = useRef(0);
  const samplesRef = useRef<Float32Array[]>([]);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const doneRef = useRef(false);
  const modeRef = useRef(mode);
  const descriptorRef = useRef(savedDescriptor);
  const onEnrolledRef = useRef(onEnrolled);
  const onVerifiedRef = useRef(onVerified);
  modeRef.current = mode;
  descriptorRef.current = savedDescriptor;
  onEnrolledRef.current = onEnrolled;
  onVerifiedRef.current = onVerified;

  const [hint, setHint] = useState("Starting the camera…");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const release = useCallback(() => {
    runRef.current += 1;
    stopStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    if (open) return;
    release();
  }, [open, release]);

  const attachVideo = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (!open || !node) return;
      const runId = runRef.current + 1;
      runRef.current = runId;
      samplesRef.current = [];
      hitsRef.current = 0;
      missesRef.current = 0;
      doneRef.current = false;
      setProgress(0);
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
              ? "Look at the camera"
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
    [open, attempt],
  );

  async function scanFrame(video: HTMLVideoElement, runId: number) {
    const sample = await readFaceFromVideo(video);
    if (runRef.current !== runId || doneRef.current) return;
    if (!sample) {
      missesRef.current += 1;
      if (missesRef.current > 3) {
        samplesRef.current = [];
        hitsRef.current = 0;
        setProgress(0);
        setHint("Look at the camera");
      }
      return;
    }
    const quality = assessFace(sample, video);
    if (!quality.ok) {
      missesRef.current += 1;
      if (missesRef.current > 2) {
        samplesRef.current = [];
        hitsRef.current = 0;
        setProgress(0);
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
    setProgress(Math.min(count / ENROLL_SAMPLES, 1));
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
    setHint("Face saved");
    setProgress(1);
    onEnrolledRef.current?.({
      descriptor: Array.from(chosen),
      preview: snapshot(video),
    });
  }

  function acceptVerifySample(sample: FaceSample, runId: number) {
    const saved = descriptorRef.current;
    if (!saved?.length) {
      setError("Face login is not set up on this device.");
      doneRef.current = true;
      return;
    }
    const distance = descriptorDistance(sample.descriptor, saved);
    if (distance <= FACE_MATCH_DISTANCE) {
      hitsRef.current += 1;
      setProgress(hitsRef.current / VERIFY_HITS);
      setHint("Hold still");
      if (hitsRef.current >= VERIFY_HITS) {
        doneRef.current = true;
        if (runRef.current !== runId) return;
        setHint("Face matched");
        onVerifiedRef.current?.();
      }
      return;
    }
    hitsRef.current = 0;
    setProgress(0);
    setHint(
      distance > 0.72
        ? "That face doesn’t match the saved one"
        : "Hold still and face the camera",
    );
  }

  const target = mode === "enroll" ? "Save face" : "Sign in with face";
  const ring = Math.round(progress * 100);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "enroll" ? "Set up face login" : "Face login"}
      footer={
        error ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              onClick={() => {
                release();
                setAttempt((value) => value + 1);
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-[28px] bg-black">
          <video
            ref={attachVideo}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="h-[70%] w-[74%] rounded-[999px] border-2 transition-colors"
              style={{
                borderColor: progress > 0 ? "rgb(52, 211, 153)" : "rgba(255,255,255,0.85)",
                boxShadow: `inset 0 0 0 ${Math.max(2, ring / 12)}px rgba(52, 211, 153, ${progress})`,
              }}
            />
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm leading-5 text-[var(--ds-gray-900)]">
          <ScanFace size={18} className="mt-0.5 shrink-0" aria-hidden />
          <p>{error || hint}</p>
        </div>
        <p className="text-xs leading-5 text-[var(--ds-gray-700)]">
          {target}. A clear, centered face is saved on this device only. Closing
          the app does not sign you out.
        </p>
      </div>
    </Modal>
  );
}
