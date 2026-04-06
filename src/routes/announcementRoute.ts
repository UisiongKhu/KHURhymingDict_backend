import { Router } from "express";
import { createAnnouncement, getAnnouncementTitles, getAnnouncementById, updateAnnouncement, deleteAnnouncement } from "../controllers/announcementController";
import { adminMiddleware } from "../middlewares/auth";

const router = Router();

router.post('/', adminMiddleware, createAnnouncement);
router.get('/', getAnnouncementTitles);
router.get('/:id', getAnnouncementById);
router.put('/:id', adminMiddleware, updateAnnouncement);
router.delete('/:id', adminMiddleware, deleteAnnouncement);

export default router;
