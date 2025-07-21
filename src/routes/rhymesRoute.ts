import { Router } from "express";
import { getRhyme, getRhymeList, initRhymes } from "../controllers/rhymeController";

const router = Router();

router.get('/get', getRhymeList);
router.get('/get/:lomaji', getRhyme);
router.get('/init', initRhymes);

export default router;