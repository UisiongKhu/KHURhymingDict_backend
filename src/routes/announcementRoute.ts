import { Router } from "express";
import { createAnnouncement, getAnnouncementTitles, getAnnouncementById, updateAnnouncement } from "../controllers/announcementController";
import { adminMiddleware } from "../middlewares/auth";

const router = Router();

router.post('/', adminMiddleware, createAnnouncement);
router.get('/', getAnnouncementTitles);
router.get('/:id', getAnnouncementById);
router.put('/:id', adminMiddleware, updateAnnouncement);

export default router;
