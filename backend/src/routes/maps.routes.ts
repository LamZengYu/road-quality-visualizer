import { Router } from "express";
import { auth } from "../middleware/auth.middleware";
import { ah } from "../util/asyncHandler";
import * as c from "../controllers/maps.controller";

const r = Router();
r.use(auth);
r.get("/", ah(c.list));
r.post("/", ah(c.create));
r.get("/:id", ah(c.get));
r.patch("/:id", ah(c.patch));
r.delete("/:id", ah(c.remove));
r.get("/:id/stats", ah(c.getStats));
export default r;
