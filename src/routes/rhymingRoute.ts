import { Router} from "express";
import { syllableRhyming, wordRhyming } from "../controllers/rhymingController";

const router = Router();

router.get('/syllable', syllableRhyming);
router.get('/word', wordRhyming); // Create

export default router;