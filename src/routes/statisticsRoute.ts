import { Router } from "express";
import { getHomepageStatistics } from "../controllers/statisticsController";

const router = Router();

router.get('/homepage', getHomepageStatistics);

export default router;