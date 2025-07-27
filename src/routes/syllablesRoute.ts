import { Router } from "express";
import { addSyllable, deleteSyllable, getSyllable, updateSyllable } from "../controllers/syllableController";

const router = Router();

router.post('/add', addSyllable);
router.get('/get', getSyllable);
router.post('/update', updateSyllable);
router.delete('/delete', deleteSyllable);

export default router;