import { Router } from "express";
import { Energia, FuerzaGravitatoria } from "./FormulasController.js";

const router = Router();

router.post(
    '/energia',
     Energia
);

router.post(
    '/FuerzaGravitatoria',
     FuerzaGravitatoria
);

export default router;