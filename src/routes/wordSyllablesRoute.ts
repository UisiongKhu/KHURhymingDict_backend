import { Router } from "express";
import { getOrder, getSyllableIdsByWordId } from "../controllers/wordSyllablesController";
import { adminMiddleware } from "../middlewares/auth";

const router = Router();

router.get('/order',adminMiddleware, getOrder); // Create
router.get('/:wordId', adminMiddleware, getSyllableIdsByWordId); // Read

export default router;