import { Router } from "express";
import { createAnnouncement, getAnnouncementTitles, getAnnouncementById, updateAnnouncement } from "../controllers/announcementController";

const router = Router();

router.post('/', createAnnouncement);
router.get('/', getAnnouncementTitles);
router.get('/:id', getAnnouncementById);
router.put('/:id', updateAnnouncement);

export default router;
