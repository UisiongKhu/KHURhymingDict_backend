import { Request, Response, NextFunction, RequestHandler } from 'express';
import db from '../models';
import { isFloat16Array } from 'util/types';
import { Rhyme } from '../models/rhyme';
import { where } from 'sequelize';
import { getLomajiArr } from '../utils/utils';

type RhymeSearchOptions = {
    IgnoreNasalSound: boolean;
    SimilarVowel: boolean;
    IgnoreFinalSound: boolean;
    SameArticulationPart: boolean;
    SameTone: boolean;
};

type syllableQueryParams = {
    lomaji: string;
    vowel: string;
    coda: string;
    nasal: boolean;
    tone: number;
    limit?: number;
    page?: number;
};

type wordQueryParams = {
    lomaji: string;
    hanjiKip: string;
    hanjiClj?: string;
    syllableIds: string;
    natureToneMark: number | null;
    limit?: number;
    page?: number;
};

const rhyming = async (params: syllableQueryParams, opts: RhymeSearchOptions) => {
    const {lomaji, vowel, coda, nasal, tone, limit, page} = params;
    let offset = 0;
    let totalPages = undefined;
    if(page!==undefined && limit!==undefined){
        offset = (page - 1) * limit;
    }
    if(offset===undefined) offset = 0;
    const whereCondition : {[key : string]: any} = {};
    if(typeof vowel ==='string' && vowel){
        if(opts.SimilarVowel){
            switch (vowel) {
                case 'iau':
                    whereCondition.vowel = ['iau','au'];
                    break;
                case 'oai':
                    whereCondition.vowel = ['oai','ai'];
                    break;
                case 'ia':
                    whereCondition.vowel = ['ia','a'];
                    break;
                case 'io͘':
                    whereCondition.vowel = ['io͘','o͘'];
                    break;
                case 'io':
                    whereCondition.vowel = ['io','o'];
                    break;
                case 'oa':
                    whereCondition.vowel = ['oa','a'];
                    break;
                case 'oe':
                    whereCondition.vowel = ['oe','e'];
                    break;
                case 'ui':
                    whereCondition.vowel = ['ui','i'];
                    break;
                case 'a':
                    whereCondition.vowel = ['a','ia','oa'];
                    break;
                case 'i':
                    whereCondition.vowel = ['i','ui'];
                    break;
                case 'e':
                    whereCondition.vowel = ['e','oe'];
                    break;
                case 'o':
                    whereCondition.vowel = ['o','io'];
                    break;
                case 'o͘':
                    whereCondition.vowel = ['o͘','io͘'];
                    break;
                default:
                    break;
            }
        }else{
            whereCondition.vowel = vowel;
        }
    } 
    if(typeof coda ==='string' && coda){
        if(vowel==='e'){
            if(coda==='k' || coda==='ng'){
                if(!opts.IgnoreFinalSound) whereCondition.coda = coda;
                else whereCondition.coda = ['k','ng'];
            }
        }else{
            if(!opts.IgnoreFinalSound){
                if(opts.SameArticulationPart){
                    if(coda==='p' || coda==='m'){
                            whereCondition.coda = ['p','m'];
                    }else if(coda==='t' || coda==='n'){
                        whereCondition.coda = ['t','n','l'];
                    }else if(coda==='k' || coda==='ng'){
                        whereCondition.coda = ['k','ng'];
                    }else if(coda==='h'){
                        whereCondition.coda = ['h', null];
                    }
                }else{
                    whereCondition.coda = coda;
                }
            }
        }
        
    }

    if(opts.SameTone){
        if(Number.isInteger(Number(tone))){
            const toneNum = Number(tone);
            if(toneNum>=1 && toneNum<=9) whereCondition.tone = toneNum;
        }
    }
    if(!opts.IgnoreNasalSound) {
        if(nasal) whereCondition.nasal = true;
        else if(!nasal) whereCondition.nasal = false;
    }
    
    
    const rhymes = await db.Syllable.findAll({
        where: {
            ...whereCondition
        },
        limit: limit,
        offset: offset
    });

    if(rhymes.length > 0) {
        const totalCount = await db.Syllable.count({
            where: {
                ...whereCondition
            }
        });
        return ({
            keyword: lomaji,
            data: rhymes,
            pagination: {
                totalItems: totalCount,
                totalPages: (limit!==undefined) ? Math.ceil(totalCount / limit) : undefined,
                currentPage: page,
                itemsPerPage: limit
            }, successful: true,
        });
    }else{
        return ({ message: 'No rhymes found matching the criteria.', successful: false });
    }
};

export const syllableRhyming : RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {lomaji, vowel, coda, nasal, tone, options, limit, page} = req.query;
        const pageNum = parseInt(req.query.page as string) || 1;
        const limitNum = parseInt(req.query.limit as string) || 20;
        let opts : RhymeSearchOptions = {
            IgnoreNasalSound: false,
            SimilarVowel: false,
            IgnoreFinalSound: false,
            SameArticulationPart: false,
            SameTone: false,
        };
        if(typeof options === 'string' && options){
            opts = JSON.parse(options) as RhymeSearchOptions;
            console.log(opts);
        }
        const result = await rhyming({
            lomaji: (typeof lomaji === 'string') ? lomaji : '',
            vowel: (typeof vowel === 'string') ? vowel : '',
            coda: (typeof coda === 'string') ? coda : '',
            nasal: (typeof nasal === 'string' && nasal.toLowerCase()==='true') ? true : false,
            tone: (typeof tone === 'string' && Number.isInteger(Number(tone))) ? Number(tone) : 0,
            limit: limitNum,
            page: pageNum
        }, opts);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

/*export const syllableRhyming : RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {lomaji, vowel, coda, nasal, tone, options, limit, page} = req.query;
        const pageNum = parseInt(req.query.page as string) || 1;
        const limitNum = parseInt(req.query.limit as string) || 20;
        const offset = (pageNum - 1) * limitNum;
        const whereCondition : {[key : string]: any} = {};
        let opts : RhymeSearchOptions = {
            IgnoreNasalSound: false,
            SimilarVowel: false,
            IgnoreFinalSound: false,
            SameArticulationPart: false,
            SameTone: false,
        };
        if(typeof options === 'string' && options){
            opts = JSON.parse(options) as RhymeSearchOptions;
            console.log(opts);
            if(opts.SameArticulationPart===true){
                if(whereCondition.coda){
                    
                }
            }
        }
        if(typeof vowel ==='string' && vowel){
            if(opts.SimilarVowel){
                switch (vowel) {
                    case 'iau':
                        whereCondition.vowel = ['iau','au'];
                        break;
                    case 'oai':
                        whereCondition.vowel = ['oai','ai'];
                        break;
                    case 'ia':
                        whereCondition.vowel = ['ia','a'];
                        break;
                    case 'io͘':
                        whereCondition.vowel = ['io͘','o͘'];
                        break;
                    case 'io':
                        whereCondition.vowel = ['io','o'];
                        break;
                    case 'oa':
                        whereCondition.vowel = ['oa','a'];
                        break;
                    case 'oe':
                        whereCondition.vowel = ['oe','e'];
                        break;
                    case 'ui':
                        whereCondition.vowel = ['ui','i'];
                        break;
                    case 'a':
                        whereCondition.vowel = ['a','ia','oa'];
                        break;
                    case 'i':
                        whereCondition.vowel = ['i','ui'];
                        break;
                    case 'e':
                        whereCondition.vowel = ['e','oe'];
                        break;
                    case 'o':
                        whereCondition.vowel = ['o','io'];
                        break;
                    case 'o͘':
                        whereCondition.vowel = ['o͘','io͘'];
                        break;
                    default:
                        break;
                }
            }else{
                whereCondition.vowel = vowel;
            }
        } 
        if(typeof coda ==='string' && coda){
            if(vowel==='e'){
                if(coda==='k' || coda==='ng'){
                    if(!opts.IgnoreFinalSound) whereCondition.coda = coda;
                    else whereCondition.coda = ['k','ng'];
                }
            }else{
                if(!opts.IgnoreFinalSound){
                    if(opts.SameArticulationPart){
                        if(coda==='p' || coda==='m'){
                                whereCondition.coda = ['p','m'];
                        }else if(coda==='t' || coda==='n'){
                            whereCondition.coda = ['t','n','l'];
                        }else if(coda==='k' || coda==='ng'){
                            whereCondition.coda = ['k','ng'];
                        }else if(coda==='h'){
                            whereCondition.coda = ['h', null];
                        }
                    }else{
                        whereCondition.coda = coda;
                    }
                }
            }
            
        }

        if(typeof tone ==='string' && tone && opts.SameTone){
            if(Number.isInteger(Number(tone))){
                const toneNum = Number(tone);
                if(toneNum>=1 && toneNum<=9) whereCondition.tone = toneNum;
            }
        }
        if(typeof nasal ==='string' && nasal && !opts.IgnoreNasalSound) {
            if(nasal.toLowerCase()==='true') whereCondition.nasal = true;
            else if(nasal.toLowerCase()==='false' || nasal === '') whereCondition.nasal = false;
        }else if(nasal !== undefined) {
            whereCondition.nasal = true;
        }
        
        
        const rhymes = await db.Syllable.findAll({
            where: {
                ...whereCondition
            },
            limit: limitNum,
            offset: offset
        });

        if(rhymes.length > 0) {
            const totalCount = await db.Syllable.count({
                where: {
                    ...whereCondition
                }
            });
            const totalPages = Math.ceil(totalCount / limitNum);
            res.status(200).json({
                keyword: lomaji,
                data: rhymes,
                pagination: {
                    totalItems: totalCount,
                    totalPages: totalPages,
                    currentPage: pageNum,
                    itemsPerPage: limitNum
                }, successful: true,
            });
        }else{
            res.status(404).json({ message: 'No rhymes found matching the criteria.', successful: false });
        }

    } catch (error) {
        next(error);
    }
};*/

export const wordRhyming = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {lomaji, hanjiKip, limit, page, rhymingSyllableCount} = req.query;

        const whereCondition: {[key: string]: any} = {};
        // syllableIds is a VARCHAR-type string of comma-separated syllable IDs like "[1,2,3]" means the word contains syllables with IDs 1, 2, and 3 in order.
        if(typeof lomaji === 'string' && lomaji){
            whereCondition.lomaji = lomaji;
        }
        if(typeof hanjiKip === 'string' && hanjiKip){
            whereCondition.hanjiKip = hanjiKip;
        }

        const keyword = await db.Word.findOne({
            where: {
                ...whereCondition
            }
        });

        if(keyword){
            const syllableIds = keyword.syllableIds; // e.g., "[1,2,3]"
            // covert the string to an array of numbers use JSON.parse
            const syllableIdArray = JSON.parse(syllableIds);
            const natureToneMark = keyword.natureToneMark;

            /**
             * Siat rhymingSyllableCount sī N.
             * Ùi tē (syllableIds.length - N) ê im chat khai sí chhōe in lóng chóng ê 
             */
        }else{
            res.status(404).json({ message: 'No matching word found.', successful: false });
        }

        res.status(200).json({ message: 'Word rhyming endpoint' });
    } catch (error) {
        next(error);
    }
};