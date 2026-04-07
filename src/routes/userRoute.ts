import { Router } from "express";
import { acceptUser, banUser, checkUser, getUser, getUsers, muteUser, userLogin, userLogout, UserRegistration } from "../controllers/userController";
import { adminMiddleware, authMiddleware } from "../middlewares/auth";

const router = Router();

router.post('/login' ,userLogin); // Login route
router.post('/register', UserRegistration); // Registration route
router.post('/logout', authMiddleware, userLogout); // Logout route
router.post('/check', checkUser); // Check if user is logged in route

router.get('/', adminMiddleware, getUsers);
router.get('/:id', adminMiddleware, getUser);
router.put('/mute/:id', adminMiddleware, muteUser);
router.put('/accept/:id', adminMiddleware, acceptUser);
router.put('/ban/:id', adminMiddleware, banUser);


export default router;