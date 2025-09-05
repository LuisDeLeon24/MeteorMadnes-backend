import { Router } from "express";
import { Horizons, getESA } from "./FetchController.js";

const router = Router();



router.get(
    "/horizons/:id",
    Horizons
    );

router.get(
    "/ESA",
     getESA
    );

export default router;