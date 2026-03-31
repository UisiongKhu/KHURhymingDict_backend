import { Request, Response, NextFunction, RequestHandler } from 'express';
import db from '../models';
import jwt from 'jsonwebtoken';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ message: 'Authorization header is missing.' });
            return;
        }
        const token = authHeader.split(' ')[1];
        if(!token){
            res.status(401).json({ message: 'Token is missing in Authorization header.' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        const isTokenValid = await db.Token.findOne({ where: { token, userId: (decoded as any).id } });
        if(!isTokenValid){
            res.status(401).json({ message: 'Invalid token. Please log in again.' });
            return;
        }
        (req as any).user = decoded;
        console.log('Authenticated user:', decoded);
        res.status(200).json({ message: 'User authenticated', user: { email: (decoded as any).email, nickname: (decoded as any).nickname } });
        next();
    } catch (e) {
        res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
        console.log(e);
        return;
    }
};

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ message: 'Authorization header is missing.' });
            return;
        }
        const token = authHeader.split(' ')[1];
        if(!token){
            res.status(401).json({ message: 'Token is missing in Authorization header.' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        const isTokenValid = await db.Token.findOne({ where: { token, userId: (decoded as any).id } });
        if(!isTokenValid){
            res.status(401).json({ message: 'Invalid token. Please log in again.' });
            return;
        }
        const user = await db.User.findByPk((decoded as any).id);
        if(user?.type !== 1){ // Assuming type 1 is admin
            res.status(403).json({ message: 'Access denied. Admins only.' });
            return;
        }
        (req as any).user = decoded;
        console.log('Admin user:', decoded);
        res.status(200).json({ message: 'Admin authenticated', user: { email: user.email, nickname: user.nickname } });
        next();
    } catch (e) {
        res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
        console.log(e);
        return;
    }
}