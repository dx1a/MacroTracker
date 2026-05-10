"use client";

import { useRef, useEffect, useState } from "react";
import { X, Camera, RotateCcw, AlertCircle } from "lucide-react";
import { createWorker, type Worker } from "tesseract.js";

export interface ScanResult {
  label?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Grayscale + contrast boost — significantly helps Tesseract on nutrition labels
function preprocessCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Moderate contrast stretch toward black/white
    const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
    d[i] = d[i + 1] = d[i + 2] = boosted;
  }
  ctx.putImageData(img, 0, 0);
}

function parseNutritionText(raw: string): ScanResult | null {
  // Log what Tesseract actually read — useful for diagnosing failures
  console.log("[Nutrition OCR raw]\n", raw);

  // Preserve structure: collapse horizontal whitespace but keep newlines
  const t = raw
    .toLowerCase()
    .replace(/[^a-z0-9.\n]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();

  console.log("[Nutrition OCR normalized]\n", t);

  function extract(patterns: RegExp[]): number {
    for (const p of patterns) {
      const m = t.match(p);
      if (m?.[1]) {
        const v = parseFloat(m[1]);
        if (!isNaN(v) && v >= 0) return v;
      }
    }
    return 0;
  }

  const calories = extract([
    /calories\s+(\d+)/,              // "Calories 250"
    /calori[ae]s\s+(\d+)/,          // OCR typos: "Calories"
    /energy\s+(\d+)\s*(?:kcal|cal)/,
    /(\d{2,4})\s*kcal/,             // "250 kcal" — common on EU labels
  ]);

  const protein = extract([
    /protein\s+(\d+(?:\.\d+)?)/,
    /proteins?\s*\n\s*(\d+(?:\.\d+)?)/,
  ]);

  const carbs = extract([
    /total\s+carbohydrates?\s+(\d+(?:\.\d+)?)/,
    /total\s+carb\s+(\d+(?:\.\d+)?)/,
    /carbohydrates?\s+(\d+(?:\.\d+)?)/,
    /carbs?\s+(\d+(?:\.\d+)?)/,
    // EU labels: "of which sugars" style — grab the "carbohydrate" line
    /carbohydrate\s*\n\s*(\d+(?:\.\d+)?)/,
  ]);

  const fat = extract([
    /total\s+fat\s+(\d+(?:\.\d+)?)/,
    /\bfat\s+(\d+(?:\.\d+)?)\s*g/,
    /\bfat\s+(\d+(?:\.\d+)?)\s*\n/,
    // EU labels: "Fat\n12"
    /\bfat\s*\n\s*(\d+(?:\.\d+)?)/,
  ]);

  if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) return null;
  return { calories, protein, carbs, fat };
}

interface CameraScannerProps {
  onFill: (result: ScanResult) => void;
  onClose: () => void;
}

type Phase = "camera" | "processing" | "error";

export function CameraScanner({ onFill, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("camera");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("Loading scanner…");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then((stream) => {
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        if (!active) return;
        setPhase("error");
        setErrorMsg("Camera access denied. Allow camera permissions and try again.");
      });

    // Tesseract loads in background while user frames the label
    createWorker("eng", 1, {
      logger: (m) => {
        if (!active) return;
        if (m.status === "recognizing text") {
          setProgress(Math.round((m.progress as number) * 100));
          setStatusMsg("Reading label…");
        } else if (m.status === "loading tesseract core") {
          setStatusMsg("Loading OCR engine…");
        } else if (m.status === "loading language traineddata") {
          setStatusMsg("Loading language data…");
        }
      },
    })
      .then(async (worker) => {
        if (!active) { worker.terminate(); return; }
        // PSM 6 = assume a single uniform block of text — best for nutrition labels
        await worker.setParameters({ tessedit_pageseg_mode: "6" });
        workerRef.current = worker;
        workerReadyRef.current = true;
        setStatusMsg("Ready");
      })
      .catch(() => {});

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate();
    };
  }, []);

  async function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    const maxDim = 1280;
    const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Preprocess: grayscale + contrast — improves OCR accuracy significantly
    preprocessCanvas(canvas);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedImage(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("processing");

    if (!workerReadyRef.current) {
      setStatusMsg("Finishing setup…");
      await new Promise<void>((resolve) => {
        const poll = setInterval(() => {
          if (workerReadyRef.current) { clearInterval(poll); resolve(); }
        }, 200);
      });
    }

    if (!workerRef.current) {
      setPhase("error");
      setErrorMsg("Scanner failed to initialize. Please try again.");
      return;
    }

    try {
      setStatusMsg("Reading label…");
      const { data } = await workerRef.current.recognize(canvas);
      const result = parseNutritionText(data.text);

      if (!result) {
        setPhase("error");
        setErrorMsg(
          "Couldn't read the nutrition values. Make sure the label fills the frame and the text is sharp — check the browser console to see what was read."
        );
        return;
      }

      onFill(result);
      onClose();
    } catch {
      setPhase("error");
      setErrorMsg("OCR failed. Try again with better lighting or a steadier hand.");
    }
  }

  function retry() {
    setCapturedImage(null);
    setErrorMsg("");
    setProgress(0);
    setStatusMsg("Ready");
    setPhase("camera");

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => {
        setPhase("error");
        setErrorMsg("Could not access camera.");
      });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      backgroundColor: "#000",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingTop: "max(env(safe-area-inset-top), 1rem)",
        paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingBottom: "1rem",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)",
      }}>
        <span style={{ color: "white", fontWeight: 600, fontSize: "0.875rem" }}>
          {phase === "processing" ? statusMsg : "Fill the frame with the label"}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "99px",
            padding: "0.4rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <X size={22} color="white" />
        </button>
      </div>

      {/* Video preview / captured still */}
      {phase !== "error" && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              display: capturedImage ? "none" : "block",
            }}
          />
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured frame"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}

          {/* Targeting reticle — shown only on camera phase */}
          {!capturedImage && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 5,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{
                width: "72%", height: "55%",
                border: "2px solid rgba(255,255,255,0.6)",
                borderRadius: "0.75rem",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
              }} />
            </div>
          )}
        </>
      )}

      {/* Processing overlay */}
      {phase === "processing" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 6,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "1.25rem",
          background: "rgba(0,0,0,0.55)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(139,92,246,0.15)",
            border: "2px solid #a78bfa",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: "#a78bfa",
              animation: "cspin 0.9s linear infinite",
            }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "white", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.625rem" }}>
              {statusMsg}
            </p>
            {progress > 0 && (
              <div style={{ width: 160, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)", margin: "0 auto" }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: "#a78bfa",
                  width: `${progress}%`,
                  transition: "width 0.2s",
                }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === "error" && (
        <div style={{
          flex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "1rem", padding: "2.5rem",
        }}>
          <AlertCircle size={44} color="#ef4444" />
          <p style={{ color: "white", textAlign: "center", fontSize: "0.875rem", lineHeight: 1.6 }}>
            {errorMsg}
          </p>
          <button
            className="btn-primary"
            onClick={retry}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <RotateCcw size={15} />
            Try Again
          </button>
        </div>
      )}

      {/* Shutter button */}
      {phase === "camera" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
          paddingTop: "1.5rem",
          background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
          gap: "0.75rem",
        }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>
            Hold steady — keep label sharp
          </p>
          <button
            onClick={capture}
            aria-label="Capture nutrition label"
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "white",
              border: "5px solid rgba(255,255,255,0.35)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <Camera size={32} color="#111" />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <style>{`@keyframes cspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
