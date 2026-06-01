// Helpers for capturing photos during a scan.
//
// vision-camera v5 changes:
//   - Photo methods moved (or removed `takePhoto` in favor of `takeSnapshot`).
//   - `takeSnapshot` no longer returns `{ path }` — it returns a HybridObject<Image>
//     which exposes methods like `saveToTemporaryFileAsync` to get an actual file path.
// This file's `capturePhoto` handles both the v4-style and v5-style returns.
import type { Camera } from "react-native-vision-camera";
import type { RefObject } from "react";
import type { BufferedPhoto } from "../db/repository";

export async function ensurePhotoDir(): Promise<void> {
  // No-op — vision-camera writes to its own cache dir.
}

interface CapturedFile {
  path: string;
}

// Tries each known API in order, then converts the returned object to a file path.
async function capturePhoto(cam: any): Promise<CapturedFile> {
  let result: any;

  if (typeof cam.takePhoto === "function") {
    result = await cam.takePhoto({ enableShutterSound: false });
  } else if (cam.controller && typeof cam.controller.takePhoto === "function") {
    result = await cam.controller.takePhoto({ enableShutterSound: false });
  } else if (typeof cam.takeSnapshot === "function") {
    result = await cam.takeSnapshot({ quality: 90 });
  } else if (cam.controller && typeof cam.controller.takeSnapshot === "function") {
    result = await cam.controller.takeSnapshot({ quality: 90 });
  } else {
    console.error(
      "[photo-capture] no take-photo method. ref keys =",
      Object.keys(cam),
      "controller keys =",
      cam.controller ? Object.keys(cam.controller) : "no controller"
    );
    throw new Error("No takePhoto / takeSnapshot method on this Camera ref");
  }

  // v4 style: result is already { path: string }
  if (result && typeof result.path === "string") {
    return { path: result.path };
  }

  // v5 style: result is a HybridObject<Image>. nitro-image's
  // saveToTemporaryFileAsync expects a format string like 'jpg' / 'png' (NOT 'jpeg').
  if (result && typeof result.saveToTemporaryFileAsync === "function") {
    let out: any;
    let lastErr: any;
    for (const args of [
      ["jpg", 90],
      ["jpg"],
      ["png"],
    ] as const) {
      try {
        out = await (result.saveToTemporaryFileAsync as any)(...args);
        if (out != null) break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (out == null) throw lastErr ?? new Error("saveToTemporaryFileAsync failed");
    const path = typeof out === "string" ? out : out?.path;
    if (typeof path !== "string") {
      throw new Error(
        `saveToTemporaryFileAsync returned no path: ${JSON.stringify(out)}`
      );
    }
    return { path };
  }

  // Fallback: maybe just a path-like string
  if (typeof result === "string") {
    return { path: result };
  }

  console.error(
    "[photo-capture] unrecognized capture result. keys =",
    result ? Object.keys(result) : "null"
  );
  throw new Error("Unknown capture result shape");
}

export async function takeAndSavePhoto(
  cameraRef: RefObject<Camera | null>,
  fix: { lat: number; lng: number }
): Promise<BufferedPhoto | null> {
  const cam = cameraRef.current as any;
  if (!cam) return null;

  const photo = await capturePhoto(cam);
  return {
    clientUuid: makeId(),
    filePath: photo.path,
    lat: fix.lat,
    lng: fix.lng,
    capturedAt: new Date().toISOString(),
  };
}

export async function deletePhoto(filePath: string): Promise<void> {
  try {
    const RNFS = require("react-native-fs");
    if (RNFS && typeof RNFS.unlink === "function") {
      await RNFS.unlink(filePath);
    }
  } catch {
    /* ignore */
  }
}

function makeId(): string {
  const rand = () =>
    Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${rand()}-${rand()}-${rand()}-${rand()}`;
}
