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
            res.status(400).json({ message: 'lack_of_field' });
            await transaction.rollback();
            return;
        }
        if(req.body.password.length < 8){
            res.status(400).json({ message: 'password_length_error' });
            await transaction.rollback();
            return;
        }
        if(req.body.nickname.length < 2 || req.body.nickname.length > 32){
            res.status(400).json({ message: 'nickname_length_error' });
            await transaction.rollback();
            return;
        }
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)){
            res.status(400).json({ message: 'email_format_error' });
            await transaction.rollback();
            return;
        }else{
            const existingUser = await db.User.findOne({ where: { email: req.body.email } });
            if(existingUser){
                res.status(400).json({ message: 'email_exists_error' });
                await transaction.rollback();
                return;
            }
        }
        const reqBodyUser : UserCreationAttribute = {
            email: req.body.email,
            password: req.body.password,
            nickname: req.body.nickname,
            status: 4, // Not verified when registered, can be changed to 0 by admin after manual verification.
        };
        const user = await db.User.create(reqBodyUser, { transaction });
        const {password, type, status, id, mutedTo, ...userData} = user.toJSON(); // Exclude password from response
        res.status(201).json({ message: 'registration_successfully', user: userData });
        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ message: 'registration_failed', error: (err as Error).message });        
    }
};

export const userLogin = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { email, password } = req.body;
        const user = await db.User.findOne({ where: {email} });
        if(!user){
            res.status(401).json({message: 'wrong_information'});
            await transaction.rollback();
            return;
        }else{
            // Compare the provided password with the password from DB
            const isMatch = await bcrypt.compare(password, user.password);
            if(!isMatch){
                res.status(401).json({message: 'wrong_information'});
                await transaction.rollback();
                return;
                return;
            }else if(user.status === 2){
                res.status(403).json({message: 'user_banned'});
                await transaction.rollback();
                return;
            }else if(user.status === 4){
                res.status(403).json({message: 'user_not_verified'});
                await transaction.rollback();
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
                res.status(200).json({message: 'login_successfully', token});
                await transaction.commit();
            }
        }
    } catch (err) {
        await transaction.rollback();
        res.status(500).json({ message: 'user_login_failed', error: (err as Error).message });
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

/**
 * @description To unmute an user, set mutedTo to a past date or null. To mute an user, set mutedTo to a future date. The status will be automatically updated based on the mutedTo value.
 */
export const muteUser = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const userId = req.params.id;
        const iUserId = parseInt(userId);
        if(isNaN(iUserId)){
            res.status(400).json({message: 'Invalid user ID.'});
            await transaction.rollback();
            return;
        }
        const user = await db.User.findByPk(iUserId);
        const mutedTo = req.body.mutedTo as string; // Get the mutedTo value from request body
        if(!user){
            res.status(404).json({message: 'User not found.'});
            await transaction.rollback();
            return;
        }
        if(mutedTo !== undefined && mutedTo !== null){
            if(isNaN(Date.parse(mutedTo))){
                res.status(400).json({message: 'Invalid mutedTo value. It should be a valid date string.'});
                await transaction.rollback();
                return;
            }else{
                const dMutedTo = new Date(mutedTo);
                if(dMutedTo > new Date()){
                    user.status = 1; // Set status to muted if mutedTo is in the future
                    user.mutedTo = dMutedTo;
                }else{
                    user.status = 0; // Set status to active if mutedTo is in the past
                    user.mutedTo = null;
                }
            }
        }else{
            res.status(400).json({message: 'mutedTo value is required.'});
            return;
        }
        await user.save();
        await transaction.commit();
        res.status(200).json({message: 'User muted successfully.'});
    } catch (e) {
        await transaction.rollback();
       next(e);
    }
};

export const acceptUser = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const user = await db.User.findByPk(req.params.id);
        if(!user){
            res.status(404).json({message: 'User not found.'});
            await transaction.rollback();
            return;
        }else if(user.status === 4){ // Only accept users with status 4 (not verified)
            user.status = 0; // Change status to active
            await user.save();
            res.status(200).json({message: 'User accepted successfully.'});
            await transaction.commit();
            return;
        }else{
            res.status(400).json({message: 'Only users with status "not verified" can be accepted.'});
            await transaction.rollback();
            return;
        }
    } catch (e) {
        await transaction.rollback();
        next(e);
    }
};

/**
 * @description To unban an user set operation to 'unban'. To ban an user, set operation to 'ban'. When banning an user, the status will be set to 2. When unbanning an user, the status will be set to 0 if mutedTo is not set or in the past, or 1 if mutedTo is in the future.
 */
export const banUser = async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const user = await db.User.findByPk(req.params.id);
        const operation = req.body.operation as string; // Get the operation value from request body
        if(operation !== 'ban' && operation !== 'unban'){
            res.status(400).json({message: 'Invalid operation. It should be either "ban" or "unban".'});
            await transaction.rollback();
            return;
        }
        if(!user){
            res.status(404).json({message: 'User not found.'});
            await transaction.rollback();
            return;
        }else{
            if(operation === 'ban'){
                user.status = 2; // Set status to banned
            }else{
                if(user.mutedTo && isNaN(Date.parse(user.mutedTo.toString()))){
                    if(new Date(user.mutedTo) > new Date()){
                        user.status = 1; // Set status to muted if mutedTo is in the future
                    }else{
                        user.status = 0; // Set status to active if mutedTo is in the past
                    }
                }else{
                    user.status = 0; // Set status to active if mutedTo is not set
                }
            }
            await user.save();
            res.status(200).json({message: 'User updated successfully.'});
            await transaction.commit();
            return;
        }
    } catch (e) {
        await transaction.rollback();
        next(e);
    }
};