// Loads pothole.onnx once at first use, then runs inference on uploaded images.
//   - sharp resizes the JPEG to 640x640 RGB and gives us raw bytes
//   - we transpose HWC → CHW and normalize to [0..1] float32
//   - onnxruntime-node runs the model
//   - yolo-decode turns the output tensor into Detection[]
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import path from "path";
import { decodeYolo, type RawDetection } from "./yolo-decode";

const MODEL_PATH = path.join(__dirname, "..", "..", "models", "pothole.onnx");
const IMG_SIZE = 640;

// Tunable via .env:
//   DETECT_CONF_THRESHOLD=0.85    (default 0.6 — stricter than YOLO's 0.25
//                                  default to cut false positives)
//   DETECT_IOU_THRESHOLD=0.45     (NMS overlap; rarely needs changing)
function envNum(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v !== undefined ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
const CONF_THRESHOLD = envNum("DETECT_CONF_THRESHOLD", 0.6);
const IOU_THRESHOLD = envNum("DETECT_IOU_THRESHOLD", 0.45);

console.log(
  `[detect] conf>=${CONF_THRESHOLD} iou>${IOU_THRESHOLD} ` +
    `(override with DETECT_CONF_THRESHOLD / DETECT_IOU_THRESHOLD in backend/.env)`
);

let sessionPromise: Promise<ort.InferenceSession> | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_PATH).then((s) => {
      console.log(
        `[detect] ONNX session ready. inputs=${s.inputNames.join(",")} outputs=${s.outputNames.join(",")}`
      );
      return s;
    });
  }
  return sessionPromise;
}

export async function detectInImage(imgBuffer: Buffer): Promise<RawDetection[]> {
  // 1. Resize → raw RGB bytes (HWC layout, uint8 0..255).
  const { data, info } = await sharp(imgBuffer)
    .resize(IMG_SIZE, IMG_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width, H = info.height, C = info.channels;

  // 2. Transpose HWC → CHW and normalize to [0..1] float32 (what YOLOv8 expects).
  const float = new Float32Array(C * H * W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hwc = (y * W + x) * C;
      for (let c = 0; c < C; c++) {
        float[c * H * W + y * W + x] = data[hwc + c] / 255;
      }
    }
  }

  // 3. Run inference.
  const session = await getSession();
  const inputName = session.inputNames[0];
  const tensor = new ort.Tensor("float32", float, [1, C, H, W]);
  const outputs = await session.run({ [inputName]: tensor });
  const out = outputs[session.outputNames[0]];

  // 4. Decode.
  return decodeYolo(
    out.data as Float32Array,
    out.dims as number[],
    CONF_THRESHOLD,
    IOU_THRESHOLD
  );
}
