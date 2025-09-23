import { Router} from "express";
import { syllableRhyming, wordRhymingByInput } from "../controllers/rhymingController";

const router = Router();

router.get('/syllable', syllableRhyming);
router.get('/word', wordRhymingByInput); // Create

export default router; 