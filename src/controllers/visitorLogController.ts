import { Request, Response, NextFunction } from "express";
import { VisitorLog } from "../models/visitorLog";
import { Op } from "sequelize";
import { Statistics } from "../models/statistics";

export const trackVisitor = async (req: Request, res: Response, next: NextFunction) => {
    try{
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
        const _24hrsAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const isInLog = await VisitorLog.findOne({
            where: {
                ip,
                visitTime: { [Op.gt]: _24hrsAgo}
            }
        });
        if(!isInLog){
            await VisitorLog.create({ ip });
            await Statistics.increment('value', { where: { key: 'total_visitors' } });
        }

        await res.status(200);
    }catch(e){
        next(e);
    }
}