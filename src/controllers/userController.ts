/**
 * @file userController.ts
 * @description CRUD operations for user management, using token-based authentication
 * @author KUS
 * @date 2026-03-23
 */

import { NextFunction, Request, Response } from 'express';
import db from '../models';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { where } from 'sequelize';
import { UserCreationAttribute } from '../models/user';

export const UserRegistration = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        if(!req.body.email || !req.body.password || !req.body.nickname){
            res.status(400).json({ message: 'Email, password and nickname are required.' });
            return;
        }
        const reqBodyUser : UserCreationAttribute = {
            email: req.body.email,
            password: req.body.password,
            nickname: req.body.nickname,
            status: 0, // default to active status
        };
        const user = await db.User.create(reqBodyUser, { transaction });
        const {password, ...userData} = user.toJSON(); // Exclude password from response
        res.status(201).json({ message: 'User registered successfully', user: userData });
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ message: 'User registration failed due to an error', error: (err as Error).message });        
    }
};

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const user = await db.User.findOne({ where: {email} });
        if(!user){
            res.status(401).json({message: 'Wrong email or password.'});
            return;
        }else{
            // Compare the provided password with the password from DB
            const isMatch = await bcrypt.compare(password, user.password);
            if(!isMatch){
                res.status(401).json({message: 'Wrong email or password.'});
                return;
            }else{
                // Login successful, generate JWT token
                const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    type: user.type,
                    nickname: user.nickname
                }, process.env.JWT_SECRET!, { expiresIn: '12h' });
                await db.Token.create({ // Store the token in DB for session management
                    userId: user.id,
                    token,
                    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours expiration
                });
                await db.User.update({ lastLoginAt: new Date() }, { where: { id: user.id } }); // Update last login time
                res.status(200).json({message: 'Login successful', token});
            }
        }
    } catch (err) {
        res.status(500).json({ message: 'User login failed due to an error', error: (err as Error).message });
    }
};

export const userLogout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header
        if(!token){
            res.status(400).json({message: 'Token is required for logout.'});
            return;
        }
        await db.Token.destroy({ where: { token } }); // Remove the token from DB to invalidate the session
        res.status(200).json({message: 'Logout successful'});
    } catch (e) {
        
    }
};

export const checkUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]; // Get token from Authorization header
        const type = req.body?.type;
        console.log(type);
        if(!token){
            res.status(400).json({message: 'You are not logged in.'});
            return;
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET!);
        console.log('Decoded token:', decoded);
        console.log((decoded as any).type);
        if(type === 'admin'){
            if((decoded as any).type !== 1 && (decoded as any).type !== '1'){ // Check if user is an admin
                res.status(403).json({message: 'You are not an administrator.'});
                return;
            }else{
                const admin = await db.User.findByPk((decoded as any).id, { attributes: { exclude: ['password'] } });
                if(!admin){
                    res.status(404).json({message: 'User not found.'});
                    return;
                }else{
                    res.status(200).json({message: 'Administrator authenticated', admin});
                    return;
                }
            }
        }else{
            const user = await db.User.findByPk((decoded as any).id, { attributes: { exclude: ['id', 'status', 'desc','password', 'created_at', 'updated_at'] } });
            if(!user){
                res.status(404).json({message: 'User not found.'});
                return;
            }else{
                res.status(200).json({message: 'User authenticated', user});
                return;
            }
        }
    } catch (e) {
        if(e instanceof jwt.TokenExpiredError){
            res.status(401).json({ message: 'Token has expired. Please log in again.' });
            return;
        }
        console.log(e);
        next(e);
    }
};

// CRUD Operations for user management (only accessible by admin users, to be implemented later)

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await db.User.findAll({ attributes: { exclude: ['password'] } });
        res.status(200).json({users});
    } catch (e) {
        next(e);
    }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await db.User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
        if(!user){
            res.status(404).json({message: 'User not found.'});
            return;
        }
        res.status(200).json({user});
    } catch (e) {
        next(e);
    }
};

export const muteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await db.User.findByPk(req.params.id);
        const mutedTo = req.body.mutedTo as string; // Get the mutedTo value from request body
        if(!user){
            res.status(404).json({message: 'User not found.'});
            return;
        }
        if(mutedTo !== undefined && mutedTo !== null){
            if(isNaN(Date.parse(mutedTo))){
                res.status(400).json({message: 'Invalid mutedTo value. It should be a valid date string.'});
                return;
            }else{
                user.mutedTo = new Date(mutedTo);
            }
        }else{
            res.status(400).json({message: 'mutedTo value is required.'});
            return;
        }
        await user.save();
        res.status(200).json({message: 'User muted successfully.'});
    } catch (e) {
       next(e);
    }
}