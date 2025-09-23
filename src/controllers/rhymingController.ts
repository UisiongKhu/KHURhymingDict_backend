import { Request, Response, NextFunction, RequestHandler } from 'express';
import db from '../models';
import { isDataView, isFloat16Array } from 'util/types';
import rhyme, { Rhyme } from '../models/rhyme';
import { Model, where } from 'sequelize';
import { getCoda, getLomajiArr, getNasal, getTone, getVowel } from '../utils/utils';
import { Op } from 'sequelize';
import { Fn } from 'sequelize/types/utils';
import sequelize from 'sequelize';
import { Syllable } from '../models/syllable';

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
    coda: string | null | undefined;
    nasal: boolean;
    tone: number | null;
    limit?: number;
    page?: number;
};

type wordQueryParams = {
    lomaji: string;
    hanjiKip: string;
    hanjiClj?: string;
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
                case 'ai':
                    whereCondition.vowel = ['oai','ai'];
                    break;
                case 'au':
                    whereCondition.vowel = ['iau','au'];
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
    }else if(coda==='' || coda===null || coda===undefined){
        whereCondition.coda = {[Op.is]: null};
        if(vowel==='e'){
            whereCondition.coda = {
                [Op.or]: {
                    [Op.is]: null,
                    [Op.eq]: 'h',
                }
            };
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

const getMaxOrder = async (wordId: number) => {
    const wordSyllableCount = await db.WordSyllables.findAndCountAll({
        where:{
            wordId,
        }
    }).then(res => {return res.count;});
    if(wordSyllableCount > 0) return wordSyllableCount-1;
    return -1;
}

const getOrder = async (wordId: number, syllableId: number) => {
    const order = await db.WordSyllables.findOne({
        where:{
            wordId,
            syllableId,
        },
        attributes: ['order'],
    }).then(res => {
        return res?.toJSON().order;
    });
    if(!order){
        return -1;
    }
}

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

export const wordRhymingByInput = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {lomaji, hanjiKip, limit, page, rhymingSyllableCount, ignoreNasalSound, similarVowel, ignoreFinalSound, sameArticulationPart, sameTone} = req.query;

        // Deal with rhyming options
        let opts : RhymeSearchOptions = {
            IgnoreNasalSound: false,
            SimilarVowel: false,
            IgnoreFinalSound: false,
            SameArticulationPart: false,
            SameTone: false,
        };
        if(typeof ignoreNasalSound === 'string' && ignoreNasalSound.toLowerCase()==='true'){
            opts.IgnoreNasalSound = true;
        }
        if(typeof similarVowel === 'string' && similarVowel.toLowerCase()==='true'){
            opts.SimilarVowel = true;
        }
        if(typeof ignoreFinalSound === 'string' && ignoreFinalSound.toLowerCase()==='true'){
            opts.IgnoreFinalSound = true;
        }
        if(typeof sameArticulationPart === 'string' && sameArticulationPart.toLowerCase()==='true'){
            opts.SameArticulationPart = true;
        }
        if(typeof sameTone === 'string' && sameTone.toLowerCase()==='true'){
            opts.SameTone = true;
        }

        if(rhymingSyllableCount===undefined || isNaN(Number(rhymingSyllableCount)) || Number(rhymingSyllableCount)<1){
            res.status(400).json({ message: 'rhymingSyllableCount is required and must be a positive integer.', successful: false });
            return;
        }

        const whereCondition: {[key: string]: any} = {};
        // syllableIds is a VARCHAR-type string of comma-separated syllable IDs like "[1,2,3]" means the word contains syllables with IDs 1, 2, and 3 in order.
        if(typeof lomaji === 'string' && lomaji){
            if(Number(rhymingSyllableCount) > getLomajiArr(lomaji).length){
                res.status(400).json({ message: 'rhymingSyllableCount must be less than the length of the keyword.', successful: false });
                return;
            }
        }else{
            res.status(400).json({ message: 'lomaji is required.', successful: false });
            return;
        }
        if(typeof hanjiKip === 'string' && hanjiKip){
            whereCondition.hanjiKip = hanjiKip;
        }else{
            res.status(400).json({ message: 'hanjiKip is required.', successful: false });
            return;
        }

        /**
         * Ah ūn soeh bêng
         * 
         * Tē 1 pō͘. Lia̍h ūn kha
         * Seng ū ūn kha ê array.
         * Tē 2 pō͘. Iōng ūn kha chhōe LÓNG CHÓNG ê ah ūn jī
         * Tē 3 pō͘. Ùi jī chhōe kāng chhù sū ê sû
         * 
         * Nā ū beh ah 2, 3, ... jī, chiah ēng tē 3 pō͘ chhōe tio̍h ê chu liāu koh tiông ho̍k tē 2, 3 pō͘ ê tōng chok.
         */

        // Lia̍h ūn kha ê array
        const syllables = getLomajiArr(lomaji);

        console.log(`-------------------------`);
        console.log(`Chhōe ê sû lūi: ${lomaji} / ${hanjiKip}`);
        console.log(`Siat tēng: ${JSON.stringify(opts)}`);
        console.log(`Ah kúi jī: ${rhymingSyllableCount}`);


        const rhymingSyllables = syllables?.slice(-Number(rhymingSyllableCount));
        const rhymeCount = rhymingSyllables?.length || 0;
        if(rhymeCount===0){
            res.status(400).json({ message: 'The word has no syllables to rhyme with.', successful: false });
            return;
        }


        let candidateWordIds: number[] = [];

        // Ah N ê ūn to̍h cháu N pái, ūi siāng bóe khai sí chhōe.
        for(let i = rhymeCount - 1; i >= 0; i--){

            const currentSyllable = rhymingSyllables ? rhymingSyllables[i]: null;
            console.log(`Teh chhōe tē kúi jī ${i+1} / ${rhymeCount} Ah kúi jī`);
            console.log(`Chhōe ê jī sī: ${currentSyllable ? currentSyllable : 'N/A'}`);
            console.log(`Téng hôe ê sû lūi sò͘: ${candidateWordIds.length}`);
            if(!currentSyllable){
                res.status(400).json({ message: 'Error retrieving syllable information.', successful: false });
                return;
            }
            //
            const relativeOrder = i- (rhymeCount - 1); // e.g., for 3 rhyming syllables, the relative orders are -2, -1, 0

            const rhymingSyllableIds = await rhyming({
                lomaji: currentSyllable,
                vowel: getVowel(currentSyllable),
                coda: getCoda(currentSyllable),
                nasal: getNasal(currentSyllable),
                tone: getTone(currentSyllable),
            }, opts).then(result => {
                if(result.successful && result.data){
                    return result.data.map(syllable => syllable.id);
                }else{
                    return [];
                }
            });

            console.log(`Ham tē ${i+1} jī ah ūn ê jī sò͘: ${rhymingSyllableIds.length}`);

            // 4a. Chhōe ū ah ūn jī ê sû
            const wordsContainsRhymingSyllables = await db.WordSyllables.findAll({
                where: {
                        syllableId: {
                            [Op.in]: rhymingSyllableIds
                            },
                    ...(candidateWordIds.length>0 ? { wordId: { [Op.in]: candidateWordIds } } : {}),
                },
                include: [
                    {
                        model: db.Word,
                        as: 'word',
                        attributes: ['id','lomaji', 'hanjiKip'],
                    }
                ]
            });
            const wordIdsContainsRhymingSyllables = wordsContainsRhymingSyllables.map(entry => entry.toJSON().wordId);

            if(wordIdsContainsRhymingSyllables.length===0){
                console.log(`a ${wordsContainsRhymingSyllables}`);
                return;
            }

            let rhymingWordsId : number[] = [];
            const rhymingWordPromises = wordIdsContainsRhymingSyllables.map(async (wordId)=> {
                const maxOrder = await getMaxOrder(wordId);
                const rhymingWordId = await db.Word.findOne({
                    where: {
                        id: wordId,
                    },
                    include: {
                        model: db.WordSyllables,
                        as: 'wordLinks',
                        where: {
                            wordId: wordId,
                            syllableId: {
                                [Op.in]: rhymingSyllableIds,
                            },
                            order: maxOrder + relativeOrder,
                        }
                    },
                    attributes: ['id']
                }).then(res=>{return res?.toJSON().id;});
                if(rhymingWordId){
                    return rhymingWordId;
                }
                return null;
            });
            rhymingWordsId = (await Promise.all(rhymingWordPromises)).filter(id=>id!==null);
            
            

            console.log(`Ham tē ${i+1} jī ah ūn ê sû lūi sò͘: ${rhymingWordsId.length}`);
            candidateWordIds= rhymingWordsId;

            if(rhymingWordsId.length === 0) {
                break;
            }

            if(candidateWordIds.length === 0){
                break;
            }else{
                console.log(`Āu hôe chhiau chhōe ê sû lūi sò͘: ${candidateWordIds.length}`);
            }
        }

        const finalRhymingWords = (await db.Word.findAll({
            attributes: ['id', 'lomaji', 'hanjiKip'],
            where: {
                id: {
                    [Op.in]: candidateWordIds,
                }
            },
        })).filter(word=>word.lomaji!==lomaji);

        if(finalRhymingWords.length === 0){
            res.status(200).json({ message: 'No rhyming words found matching the criteria.', successful: true, data: [] });
        }else{
            res.status(200).json({ successful: true, count: finalRhymingWords.length,  data: finalRhymingWords });
        }
        
    } catch (error) {
        next(error);
    }
};

export const wordRhymingByWord = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {lomaji, hanjiKip, limit, page, rhymingSyllableCount, ignoreNasalSound, similarVowel, ignoreFinalSound, sameArticulationPart, sameTone} = req.query;

        // Deal with rhyming options
        let opts : RhymeSearchOptions = {
            IgnoreNasalSound: false,
            SimilarVowel: false,
            IgnoreFinalSound: false,
            SameArticulationPart: false,
            SameTone: false,
        };
        if(typeof ignoreNasalSound === 'string' && ignoreNasalSound.toLowerCase()==='true'){
            opts.IgnoreNasalSound = true;
        }
        if(typeof similarVowel === 'string' && similarVowel.toLowerCase()==='true'){
            opts.SimilarVowel = true;
        }
        if(typeof ignoreFinalSound === 'string' && ignoreFinalSound.toLowerCase()==='true'){
            opts.IgnoreFinalSound = true;
        }
        if(typeof sameArticulationPart === 'string' && sameArticulationPart.toLowerCase()==='true'){
            opts.SameArticulationPart = true;
        }
        if(typeof sameTone === 'string' && sameTone.toLowerCase()==='true'){
            opts.SameTone = true;
        }

        if(rhymingSyllableCount===undefined || isNaN(Number(rhymingSyllableCount)) || Number(rhymingSyllableCount)<1){
            res.status(400).json({ message: 'rhymingSyllableCount is required and must be a positive integer.', successful: false });
            return;
        }

        const whereCondition: {[key: string]: any} = {};
        // syllableIds is a VARCHAR-type string of comma-separated syllable IDs like "[1,2,3]" means the word contains syllables with IDs 1, 2, and 3 in order.
        if(typeof lomaji === 'string' && lomaji){
            whereCondition.lomaji = lomaji;
            if(Number(rhymingSyllableCount) > getLomajiArr(lomaji).length){
                res.status(400).json({ message: 'rhymingSyllableCount must be less than the length of the keyword.', successful: false });
                return;
            }
        }else{
            res.status(400).json({ message: 'lomaji is required.', successful: false });
            return;
        }
        if(typeof hanjiKip === 'string' && hanjiKip){
            whereCondition.hanjiKip = hanjiKip;
        }else{
            res.status(400).json({ message: 'hanjiKip is required.', successful: false });
            return;
        }

        /**
         * Ah ūn soeh bêng
         * 
         * Tē 1 pō͘. Lia̍h ūn kha
         * Seng ū ūn kha ê array.
         * Tē 2 pō͘. Iōng ūn kha chhōe LÓNG CHÓNG ê ah ūn jī
         * Tē 3 pō͘. Ùi jī chhōe kāng chhù sū ê sû
         * 
         * Nā ū beh ah 2, 3, ... jī, chiah ēng tē 3 pō͘ chhōe tio̍h ê chu liāu koh tiông ho̍k tē 2, 3 pō͘ ê tōng chok.
         */

        // Lia̍h ūn kha ê array
        const keyword = await db.Word.findOne({
            where: {
                ...whereCondition,
            },
            include: [
                {
                    model: db.WordSyllables,
                    as: 'wordLinks',
                    attributes: ['syllableId', 'order'],
                    include: [
                        {
                            model: db.Syllable,
                            as: 'syllable',
                            attributes: ['lomaji', 'hanjiKip', 'vowel', 'coda', 'nasal', 'tone'],
                        }
                    ],
                },
            ],
            order: [[{ model: db.WordSyllables, as: 'wordLinks' }, 'order', 'ASC']],
        });

        if(!keyword){
            res.status(404).json({ message: 'No matching word found.', successful: false });
            return;
        }

        console.log(`-------------------------`);
        console.log(`Chhōe ê sû lūi: ${keyword.lomaji} / ${keyword.hanjiKip}`);
        console.log(`Siat tēng: ${JSON.stringify(opts)}`);
        console.log(`Ah kúi jī: ${rhymingSyllableCount}`);


        const syllables = keyword?.toJSON().wordLinks?.map(wordLinkData => wordLinkData.syllable);
        const rhymingSyllables = syllables?.slice(-Number(rhymingSyllableCount));
        const rhymeCount = rhymingSyllables?.length || 0;
        if(rhymeCount===0){
            res.status(400).json({ message: 'The word has no syllables to rhyme with.', successful: false });
            return;
        }


        let candidateWordIds: number[] = [];

        // Ah N ê ūn to̍h cháu N pái, ūi siāng bóe khai sí chhōe.
        for(let i = rhymeCount - 1; i >= 0; i--){

            const currentSyllable = rhymingSyllables ? rhymingSyllables[i]: null;
            console.log(`Teh chhōe tē kúi jī ${i+1} / ${rhymeCount} Ah kúi jī`);
            console.log(`Chhōe ê jī sī: ${currentSyllable ? currentSyllable.lomaji : 'N/A'}`);
            console.log(`Téng hôe ê sû lūi sò͘: ${candidateWordIds.length}`);
            if(!currentSyllable){
                res.status(400).json({ message: 'Error retrieving syllable information.', successful: false });
                return;
            }
            //
            const relativeOrder = i- (rhymeCount - 1); // e.g., for 3 rhyming syllables, the relative orders are -2, -1, 0

            const rhymingSyllableIds = await rhyming({
                lomaji: currentSyllable.lomaji,
                vowel: currentSyllable.vowel,
                coda: currentSyllable.coda,
                nasal: currentSyllable.nasal,
                tone: currentSyllable.tone,
            }, opts).then(result => {
                if(result.successful && result.data){
                    return result.data.map(syllable => syllable.id);
                }else{
                    return [];
                }
            });

            console.log(`Ham tē ${i+1} jī ah ūn ê jī sò͘: ${rhymingSyllableIds.length}`);

            // 4a. Chhōe ū ah ūn jī ê sû
            const wordsContainsRhymingSyllables = await db.WordSyllables.findAll({
                where: {
                        syllableId: {
                            [Op.in]: rhymingSyllableIds
                            },
                    ...(candidateWordIds.length>0 ? { wordId: { [Op.in]: candidateWordIds } } : {}),
                },
                include: [
                    {
                        model: db.Word,
                        as: 'word',
                        attributes: ['id','lomaji', 'hanjiKip'],
                    }
                ]
            });
            const wordIdsContainsRhymingSyllables = wordsContainsRhymingSyllables.map(entry => entry.toJSON().wordId);

            if(wordIdsContainsRhymingSyllables.length===0){
                console.log(`a ${wordsContainsRhymingSyllables}`);
                return;
            }

            let rhymingWordsId : number[] = [];
            const rhymingWordPromises = wordIdsContainsRhymingSyllables.map(async (wordId)=> {
                const maxOrder = await getMaxOrder(wordId);
                const rhymingWordId = await db.Word.findOne({
                    where: {
                        id: wordId,
                    },
                    include: {
                        model: db.WordSyllables,
                        as: 'wordLinks',
                        where: {
                            wordId: wordId,
                            syllableId: {
                                [Op.in]: rhymingSyllableIds,
                            },
                            order: maxOrder + relativeOrder,
                        }
                    },
                    attributes: ['id']
                }).then(res=>{return res?.toJSON().id;});
                if(rhymingWordId){
                    return rhymingWordId;
                }
                return null;
            });
            rhymingWordsId = (await Promise.all(rhymingWordPromises)).filter(id=>id!==null);
            
            

            console.log(`Ham tē ${i+1} jī ah ūn ê sû lūi sò͘: ${rhymingWordsId.length}`);
            candidateWordIds= rhymingWordsId;

            if(rhymingWordsId.length === 0) {
                break;
            }

            if(candidateWordIds.length === 0){
                break;
            }else{
                console.log(`Āu hôe chhiau chhōe ê sû lūi sò͘: ${candidateWordIds.length}`);
            }
        }

        const finalRhymingWordsId = candidateWordIds.filter(id=> id !== keyword.id);
        const finalRhymingWords = await db.Word.findAll({
            attributes: ['id', 'lomaji', 'hanjiKip'],
            where: {
                id: {
                    [Op.in]: finalRhymingWordsId
                }
            },
        });

        if(finalRhymingWords.length === 0){
            res.status(200).json({ message: 'No rhyming words found matching the criteria.', successful: true, data: [] });
        }else{
            res.status(200).json({ successful: true, count: finalRhymingWords.length,  data: finalRhymingWords });
        }
        



        if(keyword){
            const syllableIds = keyword.syllableIds; // e.g., "[1,2,3]"
            // covert the string to an array of numbers use JSON.parse
            const syllableIdArray = JSON.parse(syllableIds);
            const natureToneMark = keyword.natureToneMark;

            //res.status(200).json({ message: 'Found the word.', successful: true, data: keyword });

        }else{
            res.status(404).json({ message: 'No matching word found.', successful: false });
        }

    } catch (error) {
        next(error);
    }
};