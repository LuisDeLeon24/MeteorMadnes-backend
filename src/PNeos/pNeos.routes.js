import { Router } from "express";
import { insertNEOs, searchPNeo,getRandomPNeos} from "./pNeos.controller.js";


const router = Router();

router.post("/addDataSet", insertNEOs);

router.get("/search/:tempDesig", searchPNeo);

router.get("/randomPNEOS", getRandomPNeos);

export default router;
