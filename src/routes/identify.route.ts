import { Router } from "express";
import { identifyHandler } from "../controllers/identify.controller";

const router = Router();

router.post("/", identifyHandler);

export default router;
