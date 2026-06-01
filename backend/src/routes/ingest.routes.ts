import { Router } from "express";
import multer from "multer";
import { auth } from "../middleware/auth.middleware";
import { ah } from "../util/asyncHandler";
import { ingestScan, scanPhoto, scanFinalize } from "../controllers/ingest.controller";

// Hold uploaded photos in memory only — they're small (<2 MB after the phone resized)
// and we throw them away immediately after inference.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB safety cap per photo
});

const r = Router();
r.use(auth);
r.post("/scan", ah(ingestScan));
r.post("/scan-photo", upload.single("photo"), ah(scanPhoto));
r.post("/scan-finalize", ah(scanFinalize));
export default r;
