import { Router } from "express";
import { Energia, FuerzaGravitatoria } from "./FormulasController.js";

const router = Router();

router.post(
    '/energia',
     Energia
);

export default router;