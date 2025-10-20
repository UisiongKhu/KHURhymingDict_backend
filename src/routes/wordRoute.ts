import { Router } from "express";
import { addWord, deleteWord, getWord, updateWord, test, importWordKIP, getWordWithSyllables } from "../controllers/wordController";
import { importOrderFromSyllableIdsField, getSyllableIdsByWordId} from "../controllers/wordSyllablesController";

const router = Router();

router.get('/importWordSyllables', importOrderFromSyllableIdsField);
router.get('/syllableIds/:wordId', getSyllableIdsByWordId); // Get syllableIds for a word
router.get('/detail', getWordWithSyllables);
router.get('/', getWord); // Read
router.post('/', addWord); // Create
router.patch('/:id', updateWord); // Update
router.delete('/:id', deleteWord); // Delete
router.get('/test/:id', test);
router.get('/import', importWordKIP);

export default router;