import { Router } from "express";
import { acceptUser, banUser, checkTokenExistence, checkUser, getUser, getUsers, muteUser, updateUserDesc, userLogin, userLogout, UserRegistration, userTokenReset } from "../controllers/userController";
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
router.put('/desc/:id', adminMiddleware, updateUserDesc);
router.delete('/tokenReset/:id', adminMiddleware, userTokenReset);
router.get('/token/:id', adminMiddleware, checkTokenExistence);


export default router;