import { Router } from "express";
import {
  energiaMegatones,
  radioCrater,
  radioDestruccion,
  presionDinamica,
  poblacionAfectada,
  mortalidadDirecta,
  victimasIndirectas,
  perdidasEconomicas,
  severidadDemografica,
  materialEyectado,
  perdidaPIB,
  resumenImpacto
} from "./FormulasDemograficoController.js";

const router = Router();

router.post("/energiaMegatones", energiaMegatones);
router.post("/radioCrater", radioCrater);
router.post("/radioDestruccion", radioDestruccion);
router.post("/presionDinamica", presionDinamica);
router.post("/poblacionAfectada", poblacionAfectada);
router.post("/mortalidadDirecta", mortalidadDirecta);
router.post("/victimasIndirectas", victimasIndirectas);
router.post("/perdidasEconomicas", perdidasEconomicas);
router.post("/severidadDemografica", severidadDemografica);
router.post("/materialEyectado", materialEyectado);
router.post("/perdidaPIB", perdidaPIB);
router.post("/resumenImpacto", resumenImpacto);

export default router;