import { Router } from "express";
import { ah } from "../util/asyncHandler";
import { register, login } from "../controllers/auth.controller";

const r = Router();
r.post("/register", ah(register));
r.post("/login", ah(login));
export default r;
