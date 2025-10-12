import { Router} from "express";
import { syllableRhyming, wordRhymingByWord } from "../controllers/rhymingController";

const router = Router();

router.get('/syllable', syllableRhyming);
router.get('/word', wordRhymingByWord); // Create

export default router; 