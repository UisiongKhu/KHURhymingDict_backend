import { Router } from "express";
import { trackVisitor } from "../controllers/visitorLogController";

const router = Router();

router.post('/', trackVisitor);

export default router;