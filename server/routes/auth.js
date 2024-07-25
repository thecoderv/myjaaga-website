import express from "express";
const router = express.Router();
import * as auth from "../controllers/auth.js";
import { requireSignin } from "../middlewares/auth.js";

router.get("/auth", requireSignin, auth.welcome);
router.post("/pre-register", auth.preRegister);
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/forgot-password", auth.forgotPassword);
router.post("/access-account", auth.accessAccount);
router.get("/refresh-token", auth.refreshToken);

export default router;
