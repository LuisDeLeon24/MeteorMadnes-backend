import { Router } from "express";
import { 
  Horizons, 
  getSmallBodyData,
  getNeoData,
  getWorldBankData,
  getLocationData,
  getGDACSDisasters,
  getESARiskList,
  getNASANeoWsData,
  getNaturalEarthData,
  getNASASEDAC,
} from "./FetchController.js";

const router = Router();

router.get("/horizons/:id", Horizons);
router.get("/smallbody", getSmallBodyData);
router.get("/neo", getNeoData);
router.get("/worldbank", getWorldBankData);
router.get("/location", getLocationData);
router.get("/disasters", getGDACSDisasters);
router.get("/esa-risk", getESARiskList);
router.get("/neows", getNASANeoWsData);
router.get("/naturalearth", getNaturalEarthData);
router.get("/sedac", getNASASEDAC);

export default router;