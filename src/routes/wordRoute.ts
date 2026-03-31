import { Router } from "express";
import { addWord, deleteWord, getWord, updateWord, test, importWordKIP, getWordWithSyllables } from "../controllers/wordController";
import { importOrderFromSyllableIdsField, getSyllableIdsByWordId} from "../controllers/wordSyllablesController";
import { adminMiddleware } from "../middlewares/auth";

const router = Router();

router.get('/importWordSyllables', adminMiddleware, importOrderFromSyllableIdsField);
router.get('/syllableIds/:wordId', getSyllableIdsByWordId); // Get syllableIds for a word
router.get('/detail', getWordWithSyllables);
router.get('/', adminMiddleware, getWord); // Read
router.post('/', adminMiddleware, addWord); // Create
router.patch('/:id', adminMiddleware, updateWord); // Update
router.delete('/:id', adminMiddleware, deleteWord); // Delete
router.get('/test/:id', adminMiddleware, test);
router.get('/import', adminMiddleware, importWordKIP);

export default router;