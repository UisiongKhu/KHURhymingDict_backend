import { Router } from "express";
import { getRhyme, initRhymes } from "../controllers/rhymeController";

const router = Router();

router.get('/get', getRhyme);
router.get('/init', initRhymes);

export default router;