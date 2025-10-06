import { Router } from "express";
import { 
  saveScore, 
  getAllScores, 
  getUserScores, 
  getStatistics,
  getUserStatistics 
} from "./statistics.controller.js";

const router = Router();

router.post("/save", saveScore);
router.get("/all", getAllScores);
router.get("/user/:uid", getUserScores);
router.get("/analytics", getStatistics);
router.get("/analytics/user/:uid", getUserStatistics);

export default router;