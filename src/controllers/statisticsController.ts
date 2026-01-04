import { Request, Response, NextFunction } from 'express';
import { VisitorLog } from '../models/visitorLog';
import { Statistics } from '../models/statistics';
import { Syllable } from '../models/syllable';
import { Word } from '../models/word';
import { stat } from 'fs';

export const getHomepageStatistics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const statistics = {
            totalVisitors: 0,
            searchCounter: 0,
            syllableCounter: 0,
            wordCounter: 0,
            dataSourceAmount: 0,
        }
        console.log('Fetching homepage statistics...');
        statistics.totalVisitors = await Statistics.findOne({ where: { key: 'total_visitors' } }).then(record => record ? record.value : 0);
        statistics.searchCounter = await Statistics.findOne({ where: { key: 'search_counter' } }).then(record => record ? record.value : 0);
        statistics.syllableCounter = await Syllable.count();
        statistics.wordCounter = await Word.count();
        statistics.dataSourceAmount = await Statistics.findOne({ where: { key: 'data_source_amount' } }).then(record => record ? record.value : 0);

        res.status(200).json(statistics);
    } catch (e) {
        next(e);
    }
}