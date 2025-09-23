import { Request, Response, NextFunction, RequestHandler } from "express";
import db from "../models";

export const importOrderFromSyllableIdsField : RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {

        for(let i=682;i<=22639;i++) {
            const word = await db.Word.findOne({
                where: {id: i},
            });
            if(!word) continue;
            if(!word.syllableIds) continue;
            console.log(`Processing word id=${word.id}`);
            const syllableIds = word.syllableIds;
            const syllableIdArr = JSON.parse(syllableIds) as number[];
            if(syllableIdArr.length === 0) continue;
            console.log(`Syllable IDs: ${syllableIdArr}`);
            for(let j=0;j<syllableIdArr.length;j++) {
                const syllableId = syllableIdArr[j];
                // Check if the entry already exists
                const existingEntry = await db.WordSyllables.findOne({
                    where: {
                        wordId: word.id,
                        syllableId: syllableId,
                        order: j, // 0-based index
                    }
                });
                if (existingEntry) {
                    continue; // Skip if the entry already exists
                }
                await db.WordSyllables.create({
                    wordId: word.id,
                    syllableId: syllableId,
                    order: j, // 0-based index
                });
            }
        }
        res.status(200).json({ message: 'Import completed', successful: true });
    } catch (error) {
        next(error);
    }
}

export const addWordSyllable : RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { wordId, syllableId, order } = req.body;
        if (!wordId || !syllableId || order === undefined) {
            res.status(400).json({ message: 'wordId, syllableId and order are required', successful: false } );
        }
        if( isNaN(Number(order)) || Number(order) < 1 ) {
            res.status(400).json({ message: 'order must be a positive integer', successful: false } );
        }
        if( isNaN(Number(wordId)) || isNaN(Number(syllableId)) ) {
            res.status(400).json({ message: 'wordId and syllableId must be integers', successful: false } );
        }
        
        // Check if the wordId and syllableId exist
        const word = await db.Word.findByPk(Number(wordId));
        if (!word) {
            res.status(404).json({ message: 'Word not found', successful: false });
        }
        const syllable = await db.Syllable.findByPk(Number(syllableId));
        if (!syllable) {
            res.status(404).json({ message: 'Syllable not found', successful: false });
        }

        // Check if the order already exists for the given wordId
        const existingEntry = await db.WordSyllables.findOne({
            where: {
                wordId: Number(wordId),
                order: Number(order),
            }
        });
        if (existingEntry) {
            res.status(409).json({ message: 'Order already exists for this word', successful: false });
        }
        const newEntry = await db.WordSyllables.create({
            wordId: Number(wordId),
            syllableId: Number(syllableId),
            order: Number(order),
        });
        res.status(201).json({ message: 'WordSyllable added successfully', entry: newEntry, successful: true });
    } catch (error) {
        next(error);
    }
}

export const getSyllableIdsByWordId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { wordId } = req.params;
        if (!wordId) {
            res.status(400).json({ message: 'wordId is required', successful: false } );
        }

        const wordSyllableData = await db.WordSyllables.findAll({
            where: { wordId: Number(wordId) },
            order: [['order', 'ASC']],
        });

        const syllableIds = wordSyllableData.map(ws => ws.syllableId);
        
        res.status(200).json({ syllableIds, successful: true });
    } catch (error) {
        next(error);
    }
}

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { wordId, syllableId } = req.query;
        if (!wordId || !syllableId) {
            res.status(400).json({ message: 'wordId and syllableId are required', successful: false } );
        }

        const order = await db.WordSyllables.findOne({
            where: {
                wordId: Number(wordId),
                syllableId: Number(syllableId),
            }
        });

        if(!order) {
             res.status(404).json({ message: 'Order not found', successful: false });
        }
        
         res.status(200).json({ order: order!.order, successful: true });
    } catch (error) {
        next(error);
    }
}