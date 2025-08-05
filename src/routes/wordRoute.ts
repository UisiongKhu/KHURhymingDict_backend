import { Router } from "express";
import { addWord, deleteWord, getWord, updateWord, test } from "../controllers/wordController";

const router = Router();

router.get('/', getWord); // Read
router.post('/', addWord); // Create
router.patch('/:id', updateWord); // Update
router.delete('/:id', deleteWord); // Delete
router.get('/test/:id', test);

export default router;