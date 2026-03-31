import { Router } from "express";
import { checkUser, userLogin, userLogout, UserRegistration } from "../controllers/userController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.post('/login' ,userLogin); // Login route
router.post('/register', UserRegistration); // Registration route
router.post('/logout', authMiddleware, userLogout); // Logout route
router.post('/check', checkUser); // Check if user is logged in route


export default router;