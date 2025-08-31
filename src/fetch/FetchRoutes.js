import { Router } from "express";
import { getHorizons, getESA } from "./FetchController.js";

const router = Router();

router.get("/horizons", getHorizons);
router.get("/ESA", getESA);

export default router;