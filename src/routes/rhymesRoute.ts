import { Router } from "express";
import { getRhyme, initRhymes } from "../controllers/rhymeController";
import { adminMiddleware } from "../middlewares/auth";

const router = Router();

router.get('/', getRhyme); // Read
router.post('/init', adminMiddleware, initRhymes); // Create

export default router;