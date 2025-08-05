import { Router } from "express";
import { getRhyme, initRhymes } from "../controllers/rhymeController";

const router = Router();

router.get('/', getRhyme); // Read
router.post('/init', initRhymes); // Create

export default router;