import { Router } from "express";
import {
  poblacionAfectada,
  mortalidadDirecta,
  victimasIndirectas,
  perdidasEconomicas,
  severidadDemografica
} from "./FormulasDemograficoController.js";

import {
  EnergiaCinetica,
  DesaceleracionAtmosferica,
  Luminosidad,
  PerdidaMasaAblacion,
  AlturaFragmentacion,
  FuerzaArrastreOscuro,
  PresionDinamica,
  EnergiaSismicaImpacto,
  EnergiaMegatones,
  DatosCompletosAsteroide
} from "./FormulasFisicoController.js";


const router = Router();

router.post("/poblacionAfectada", poblacionAfectada);
router.post("/mortalidadDirecta", mortalidadDirecta);
router.post("/victimasIndirectas", victimasIndirectas);
router.post("/perdidasEconomicas", perdidasEconomicas);
router.post("/severidadDemografica", severidadDemografica);
router.post("/energiaCinetica", EnergiaCinetica);
router.post("/desaceleracionAtmosferica", DesaceleracionAtmosferica);
router.post("/luminosidad", Luminosidad);
router.post("/perdidaMasaAblacion", PerdidaMasaAblacion);
router.post("/alturaFragmentacion", AlturaFragmentacion);
router.post("/fuerzaArrastreOscuro", FuerzaArrastreOscuro);
router.post("/presionDinamica", PresionDinamica);
router.post("/energiaSismicaImpacto", EnergiaSismicaImpacto);
router.post("/energiaMegatones", EnergiaMegatones);
router.post("/datosCompletosAsteroide", DatosCompletosAsteroide);

export default router;