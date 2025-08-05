import { Router } from "express";
import { addSyllable, deleteSyllable, getSyllable, updateSyllable } from "../controllers/syllableController";

const router = Router();

router.get('/', getSyllable); // Read
router.post('/', addSyllable); // Create
router.patch('/:id', updateSyllable); // Update
router.delete('/:id', deleteSyllable); // Delete

export default router;