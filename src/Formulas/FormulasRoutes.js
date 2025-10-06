import { Router } from "express";
import {
  calcularPoblacionAfectada,
  calcularMuertesDirectas,
  calcularMuertesIndirectas,
  calcularPerdidaPIB,
  calcularPerdidasEconomicas,
  calcularSeveridadDemografica,
  poblacionAfectada,
  perdidaPIB,
  mortalidadDirecta,
  victimasIndirectas,
  perdidasEconomicas,
  severidadDemografica,
  resumenImpacto
} from "./FormulasDemograficoController.js";

import {
  DatosCompletosAsteroide
} from "./FormulasFisicoController.js";


const router = Router();

router.post("/poblacionAfectada", poblacionAfectada);
router.post("/mortalidadDirecta", mortalidadDirecta);
router.post("/victimasIndirectas", victimasIndirectas);
router.post("/perdidasEconomicas", perdidasEconomicas);
router.post("/severidadDemografica", severidadDemografica);
router.post("/perdidaPIB", perdidaPIB);
router.post("/resumenImpacto", resumenImpacto);

router.post("/datosCompletosAsteroide", DatosCompletosAsteroide);

export default router;