/**
 * Announcement Controller
 * Handles CRUD operations for announcements
 * Author: KUS
 */

import { NextFunction, Request, Response } from 'express';
import { Announcement, AnnouncementCreationAttribute } from '../models/announcement';

export const createAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { title, content } = req.body;
        if(!req.body){
            res.status(400).json({ message: 'Request body is missing' });
            return
        }
        const newAnnouncementData : AnnouncementCreationAttribute = {
            title: title,
            content: content,
            isDeleted: false,
        };
        if(!title || !content) {
            res.status(400).json({ message: 'Title and content are required' });
            return;
        }
        const newAnnouncement = await Announcement.create(newAnnouncementData);
        res.status(201).json(newAnnouncement);
    } catch (e) {
        next(e);
    }
};


export const getAnnouncementTitles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcementTitles = await Announcement.findAll({
            where: { isDeleted: false },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'title', 'createdAt'],
        });
        res.status(200).json(announcementTitles);
    } catch (e) {
        next(e);
    }
};

export const getAnnouncementById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcementId = parseInt(req.params.id, 10);
        const announcement = await Announcement.findOne({
            where: { id: announcementId, isDeleted: false },
        });
        if (!announcement) {
            res.status(404).json({ message: 'Announcement not found' });
            return;
        }
        res.status(200).json(announcement);
    } catch (e) {
        next(e);
    }
};
      


export const updateAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcementId = parseInt(req.params.id, 10);
        const { title, content } = req.body;
        const announcement = await Announcement.findOne({ where: { id: announcementId, isDeleted: false } });
        if (!announcement) {
            res.status(404).json({ message: 'Announcement not found' });
            return;
        }
        announcement.title = title;
        announcement.content = content;
        await announcement.save();
        res.status(200).json(announcement);
    } catch (e) {
        next(e);
    }
};


export const deleteAnnouncement = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const announcementId = parseInt(req.params.id, 10);
        const announcement = await Announcement.findOne({ where: { id: announcementId, isDeleted: false } });
        if (!announcement) {
            res.status(404).json({ message: 'Announcement not found' });
            return;
        }
        announcement.isDeleted = true;
        await announcement.save();
        res.status(200).json({ message: 'Announcement deleted successfully' });
    } catch (e) {
        next(e);
    }
};