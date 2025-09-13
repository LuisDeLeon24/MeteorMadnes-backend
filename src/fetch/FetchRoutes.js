import { Router } from "express";
import { 
  Horizons, 
  getESA,
  getSmallBodyData,
  getNeoData,
  getWorldBankData,
  getLocationData,
  getDisasterData,
  //getPopulationData // BONUS
} from "./FetchController.js";

const router = Router();

router.get("/horizons/:id", Horizons);
router.get("/ESA", getESA);

// Nuevas rutas para las 5 APIs
router.get("/smallbody", getSmallBodyData);
router.get("/neo", getNeoData);
router.get("/worldbank", getWorldBankData);
router.get("/location", getLocationData);
router.get("/disasters", getDisasterData);
//router.get("/population", getPopulationData); // BONUS

export default router;