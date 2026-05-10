"use client";

import { useRef, useEffect, useState } from "react";
import { X, Camera, RotateCcw, AlertCircle, Check } from "lucide-react";
import { createWorker, PSM, type Worker } from "tesseract.js";

export interface ScanResult {
  label?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface ReviewData {
  result: ScanResult;
  annotatedImage: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const NUTRITION_KEYWORDS = [
  "calorie", "protein", "carbohydrate", "carb", "fat", "energy", "kcal",
  "sodium", "sugar", "fiber", "cholesterol",
];
const HEADER_KEYWORDS = ["nutrition facts", "nutrition information", "supplement facts"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function applyPreprocess(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.min(255, Math.max(0, (gray - 128) * 1.6 + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

function preprocessForOcr(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.width;
  dst.height = src.height;
  const ctx = dst.getContext("2d")!;
  ctx.drawImage(src, 0, 0);
  applyPreprocess(ctx, dst.width, dst.height);
  return dst;
}

type OcrLine = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

function drawOcrBoxes(
  octx: CanvasRenderingContext2D,
  lines: OcrLine[],
  scaleX: number,
  scaleY: number,
  alpha = 1,
) {
  for (const line of lines) {
    if (line.confidence < 25 || !line.text.trim()) continue;
    const { x0, y0, x1, y1 } = line.bbox;
    const bx = x0 * scaleX;
    const by = y0 * scaleY;
    const bw = (x1 - x0) * scaleX;
    const bh = (y1 - y0) * scaleY;
    if (bw < 4 || bh < 4) continue;

    const text = line.text.toLowerCase();
    const isHeader = HEADER_KEYWORDS.some((k) => text.includes(k));
    const isNutrition = NUTRITION_KEYWORDS.some((k) => text.includes(k));

    octx.globalAlpha = alpha;
    octx.lineWidth = isHeader || isNutrition ? 2 : 1;

    if (isHeader) {
      octx.fillStyle = "rgba(167,139,250,0.18)";
      octx.fillRect(bx, by, bw, bh);
      octx.strokeStyle = "#a78bfa";
    } else if (isNutrition) {
      octx.fillStyle = "rgba(16,217,160,0.12)";
      octx.fillRect(bx, by, bw, bh);
      octx.strokeStyle = "#10d9a0";
    } else {
      octx.strokeStyle = "rgba(255,255,255,0.22)";
    }
    octx.strokeRect(bx, by, bw, bh);
  }
  octx.globalAlpha = 1;
}

// ── Text parsing ─────────────────────────────────────────────────────────────

function parseNutritionText(raw: string): ScanResult | null {
  console.log("[Nutrition OCR raw]\n", raw);

  const t = raw
    .toLowerCase()
    .replace(/[^a-z0-9.\n]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();

  console.log("[Nutrition OCR normalized]\n", t);

  let matched = 0;
  function extract(patterns: RegExp[]): number {
    for (const p of patterns) {
      const m = t.match(p);
      if (m?.[1]) {
        const v = parseFloat(m[1]);
        if (!isNaN(v) && v >= 0) { matched++; return v; }
      }
    }
    return 0;
  }

  const calories = extract([
    /calories\s+(\d+)/,
    /calori[ae]s\s+(\d+)/,
    /energy\s+(\d+)\s*(?:kcal|cal)/,
    /(\d{2,4})\s*kcal/,
  ]);
  const protein = extract([
    /protein\s+(\d+(?:\.\d+)?)/,
    /protein\s*\n\s*(\d+(?:\.\d+)?)/,
  ]);
  const carbs = extract([
    /total\s+carbohydrates?\s+(\d+(?:\.\d+)?)/,
    /total\s+carb\s+(\d+(?:\.\d+)?)/,
    /carbohydrates?\s+(\d+(?:\.\d+)?)/,
    /carbohydrate\s*\n\s*(\d+(?:\.\d+)?)/,
    /carbs?\s+(\d+(?:\.\d+)?)/,
  ]);
  const fat = extract([
    /total\s+fat\s+(\d+(?:\.\d+)?)/,
    /\bfat\s+(\d+(?:\.\d+)?)\s*g/,
    /\bfat\s*\n\s*(\d+(?:\.\d+)?)/,
  ]);

  if (matched === 0) return null;

  // Truncate macros to 1 decimal place — fixes OCR misreading trailing 'g' as '9'
  // e.g. "9.4g" → OCR outputs "9.49" → truncated back to 9.4
  const t1 = (v: number) => Math.trunc(v * 10) / 10;

  return {
    calories: Math.round(calories),
    protein:  t1(protein),
    carbs:    t1(carbs),
    fat:      t1(fat),
  };
}

// ── Component ────────────────────────────────────────────────────────────────

interface CameraScannerProps {
  onFill: (result: ScanResult) => void;
  onClose: () => void;
}

type Phase = "camera" | "processing" | "review" | "error";

export function CameraScanner({ onFill, onClose }: CameraScannerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const overlayRef    = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const workerRef     = useRef<Worker | null>(null);
  const workerReadyRef  = useRef(false);
  const liveActiveRef   = useRef(false);  // controls live scan loop
  const liveBusyRef     = useRef(false);  // prevents concurrent OCR calls

  const [phase, setPhase] = useState<Phase>("camera");
  const [statusMsg, setStatusMsg] = useState("Loading scanner…");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);

  // ── Live OCR loop ──────────────────────────────────────────────────────────

  async function runLiveScan() {
    const video  = videoRef.current;
    const overlay = overlayRef.current;
    const worker  = workerRef.current;
    if (!video || !overlay || !worker || video.videoWidth === 0) return;

    const dw = video.clientWidth  || window.innerWidth;
    const dh = video.clientHeight || window.innerHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Compute cover-crop: capture only the visible portion of the video
    const coverScale = Math.max(dw / vw, dh / vh);
    const srcW = dw / coverScale;
    const srcH = dh / coverScale;
    const srcX = (vw - srcW) / 2;
    const srcY = (vh - srcH) / 2;

    // Small target for fast OCR
    const TW = 360;
    const TH = Math.round(TW * (dh / dw));

    const tmp = document.createElement("canvas");
    tmp.width  = TW;
    tmp.height = TH;
    const tctx = tmp.getContext("2d")!;
    tctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, TW, TH);
    applyPreprocess(tctx, TW, TH);

    const { data } = await worker.recognize(tmp);

    if (!liveActiveRef.current) return; // stopped while we were scanning

    // Resize overlay canvas to display dimensions if needed
    if (overlay.width !== dw || overlay.height !== dh) {
      overlay.width  = dw;
      overlay.height = dh;
    }

    const octx = overlay.getContext("2d")!;
    octx.clearRect(0, 0, dw, dh);
    drawOcrBoxes(octx, data.lines as OcrLine[], dw / TW, dh / TH, 0.85);
  }

  async function liveScanLoop() {
    if (!liveActiveRef.current || liveBusyRef.current) return;
    liveBusyRef.current = true;
    try { await runLiveScan(); } catch { /* ignore */ }
    liveBusyRef.current = false;
    if (liveActiveRef.current) setTimeout(liveScanLoop, 400);
  }

  // ── Camera + worker init ───────────────────────────────────────────────────

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
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
        workerRef.current = worker;
        workerReadyRef.current = true;
        setStatusMsg("Ready");
        // Kick off live scanning now that the worker is ready
        liveActiveRef.current = true;
        liveScanLoop();
      })
      .catch(() => {});

    return () => {
      active = false;
      liveActiveRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture ────────────────────────────────────────────────────────────────

  async function capture() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    liveActiveRef.current = false; // stop live scan

    const maxDim = 1280;
    const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
    canvas.width  = Math.round(video.videoWidth  * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("processing");

    const ocrCanvas = preprocessForOcr(canvas);

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
      const { data } = await workerRef.current.recognize(ocrCanvas);

      // Annotate the original color canvas with boxes
      const octx = canvas.getContext("2d")!;
      drawOcrBoxes(octx, data.lines as OcrLine[], 1, 1);

      const result = parseNutritionText(data.text);

      const annotatedImage = canvas.toDataURL("image/jpeg", 0.92);

      if (!result) {
        setReviewData({ result: { calories: 0, protein: 0, carbs: 0, fat: 0 }, annotatedImage });
        setPhase("error");
        setErrorMsg("Nutrition values not found — see the highlighted boxes to check what was detected, then retake if needed.");
        return;
      }

      setReviewData({ result, annotatedImage });
      setPhase("review");
    } catch {
      setPhase("error");
      setErrorMsg("OCR failed. Try again with better lighting or a steadier hand.");
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function confirm() {
    if (reviewData) { onFill(reviewData.result); onClose(); }
  }

  function retry() {
    setReviewData(null);
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
        liveActiveRef.current = true;
        liveScanLoop();
      })
      .catch(() => {
        setPhase("error");
        setErrorMsg("Could not access camera.");
      });
  }

  const r = reviewData?.result;

  // ── Render ─────────────────────────────────────────────────────────────────

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
          {phase === "camera"     && "Point at a nutrition label"}
          {phase === "processing" && statusMsg}
          {phase === "review"     && "Review detected values"}
          {phase === "error"      && "Scan failed"}
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

      {/* Camera phase */}
      {phase === "camera" && (
        <>
          <video
            ref={videoRef}
            autoPlay playsInline muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Live OCR overlay */}
          <canvas
            ref={overlayRef}
            style={{
              position: "absolute", inset: 0, zIndex: 5,
              width: "100%", height: "100%",
              pointerEvents: "none",
            }}
          />

          {/* Targeting reticle */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none",
          }}>
            <div style={{
              width: "78%", height: "52%",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: "0.75rem",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            }} />
          </div>
        </>
      )}

      {/* Annotated still — review + error */}
      {(phase === "review" || phase === "error") && reviewData?.annotatedImage && (
        <img
          src={reviewData.annotatedImage}
          alt="Detected label"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}

      {/* Processing overlay */}
      {phase === "processing" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 6,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: "1.25rem", background: "rgba(0,0,0,0.6)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "rgba(139,92,246,0.15)",
            border: "2px solid #a78bfa",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid transparent", borderTopColor: "#a78bfa",
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
                  height: "100%", borderRadius: 99, background: "#a78bfa",
                  width: `${progress}%`, transition: "width 0.2s",
                }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review card */}
      {phase === "review" && r && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          background: "rgba(22,27,39,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1.25rem 1.25rem 0 0",
          padding: "1.25rem 1.5rem",
          paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)",
        }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", fontSize: "0.7rem", color: "rgba(255,255,255,0.45)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10d9a0", display: "inline-block" }} />
              Nutrition rows
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#a78bfa", display: "inline-block" }} />
              Label header
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.22)", display: "inline-block" }} />
              Other text
            </span>
          </div>

          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.625rem" }}>
            Detected values
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            {[
              { label: "Calories", value: r.calories, color: "var(--color-calories)", unit: "" },
              { label: "Protein",  value: r.protein,  color: "var(--color-protein)",  unit: "g" },
              { label: "Carbs",    value: r.carbs,    color: "var(--color-carbs)",    unit: "g" },
              { label: "Fat",      value: r.fat,      color: "var(--color-fat)",      unit: "g" },
            ].map(({ label, value, color, unit }) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.06)", borderRadius: "0.625rem",
                padding: "0.5rem", textAlign: "center",
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color }}>
                  {`${value}${unit}`}
                </div>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: "0.15rem" }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              onClick={retry}
              className="btn-ghost"
              style={{ flex: 1, justifyContent: "center", color: "rgba(255,255,255,0.7)", borderColor: "rgba(255,255,255,0.15)" }}
            >
              <RotateCcw size={15} /> Retake
            </button>
            <button onClick={confirm} className="btn-primary" style={{ flex: 2, justifyContent: "center" }}>
              <Check size={15} /> Use These Values
            </button>
          </div>
        </div>
      )}

      {/* Error card */}
      {phase === "error" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          background: "rgba(22,27,39,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1.25rem 1.25rem 0 0",
          padding: "1.5rem",
          paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
        }}>
          <AlertCircle size={36} color="#ef4444" />
          <p style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", fontSize: "0.85rem", lineHeight: 1.6 }}>
            {errorMsg}
          </p>
          <button className="btn-primary" onClick={retry} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <RotateCcw size={15} /> Try Again
          </button>
        </div>
      )}

      {/* Shutter */}
      {phase === "camera" && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingBottom: "max(env(safe-area-inset-bottom), 1.5rem)",
          paddingTop: "1.5rem",
          background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)",
          gap: "0.75rem",
        }}>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem" }}>
            Hold steady — keep label sharp and in frame
          </p>
          <button
            onClick={capture}
            aria-label="Capture nutrition label"
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "white", border: "5px solid rgba(255,255,255,0.35)",
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
