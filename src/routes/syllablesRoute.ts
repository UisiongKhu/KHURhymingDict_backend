import { Router } from "express";
import { addSyllable, deleteSyllable, getSyllable, updateSyllable } from "../controllers/syllableController";
import { adminMiddleware } from "../middlewares/auth";

const router = Router();

router.get('/', adminMiddleware, getSyllable); // Read
router.post('/', adminMiddleware, addSyllable); // Create
router.patch('/:id', adminMiddleware, updateSyllable); // Update
router.delete('/:id', adminMiddleware, deleteSyllable); // Delete

export default router;