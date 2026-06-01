import { Router } from "express";
import { auth } from "../middleware/auth.middleware";
import { ah } from "../util/asyncHandler";
import { getDetail, patch, remove } from "../controllers/paths.controller";

const r = Router();
r.use(auth);
r.get("/:id", ah(getDetail));
r.patch("/:id", ah(patch));
r.delete("/:id", ah(remove));
export default r;
