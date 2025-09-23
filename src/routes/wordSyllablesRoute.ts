import { Router } from "express";
import { getOrder, getSyllableIdsByWordId } from "../controllers/wordSyllablesController";

const router = Router();

router.get('/order', getOrder); // Create
router.get('/:wordId', getSyllableIdsByWordId); // Read

export default router;