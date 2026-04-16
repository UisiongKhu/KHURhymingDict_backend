import { Request, Response, NextFunction, RequestHandler } from 'express';
import db from '../models';
import { isDataView, isFloat16Array } from 'util/types';
import rhyme, { Rhyme } from '../models/rhyme';
import { Model, QueryTypes, Utils, where } from 'sequelize';
import { codaList, getCoda, getLomajiArr, getNasal, getTone, getVowel } from '../utils/utils';
import { Op } from 'sequelize';
import { Fn } from 'sequelize/types/utils';
import sequelize from 'sequelize';
import { Syllable } from '../models/syllable';
import { Statistics } from '../models/statistics';

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

const SimilarVowels : {[key: string]: string[]} = {
    'iau': ['iau', 'au'],
    'oai': ['oai', 'ai'],
    'ai':  ['oai', 'ai'],
    'au':  ['iau', 'au'],
    'ia':  ['ia', 'a'],
    'io͘': ['io͘', 'o͘'],
    'io':  ['io', 'o'],
    'oa':  ['oa', 'a'],
    'oe':  ['oe', 'e'],
    'ui':  ['ui', 'i'],
    'a':   ['a', 'ia', 'oa'],
    'i':   ['i', 'ui'],
    'e':   ['e', 'oe'],
    'o':   ['o', 'io'],
    'o͘':  ['o͘', 'io͘']
}

const SameArituculationPartCodas : {[key: string]: any[]} = {
    'p': ['p', 'm'],
    'm': ['p', 'm'],
    't': ['t', 'n'],
    'n': ['t', 'n'],
    'k': ['k', 'ng'],
    'ng': ['k', 'ng'],
    'h': ['h', null],
}

const getRhymingCondition = (index: number, rhymingTarget: syllableQueryParams, options: RhymeSearchOptions) => {
    const toneStr = options.SameTone ? ` AND s.tone = '${rhymingTarget.tone}' ` : ` `;
    const vowelStr = options.SimilarVowel ? ` AND s.vowel IN (${SimilarVowels[rhymingTarget.vowel]?.map((v) => `'${v}'`).join(', ')})` : ` AND s.vowel = '${rhymingTarget.vowel}' `;
    const nasalStr = options.IgnoreNasalSound ? `` : ` AND s.nasal = '${rhymingTarget.nasal?1:0}' `;
    let codaStr = ``;
    // 若是「無欲忽略尾音」才入來遮判斷
    if (!options.IgnoreFinalSound) {
        // 針對韻母是 'e' 個特殊處理 (台語個 'e' 配合無仝尾音，發音部位會變)
        if (rhymingTarget.vowel === 'e') {
            // 若是 "ek" 或者是 "eng" 個時陣 (舌根音)
            if (rhymingTarget.coda === 'k' || rhymingTarget.coda === 'ng') {
                if (options.SameArticulationPart) {
                    // 同部位發音：'k' 參 'ng' 算做一組 (攏是舌根音)
                    codaStr = ` AND s.coda IN ('k', 'ng') `;
                } else {
                    // 精確比對：原本是 'k' 就揣 'k'，是 'ng' 就揣 'ng'
                    codaStr = ` AND s.coda = '${rhymingTarget.coda}' `;
                }
            } 
            // 若是開口呼 "e" 或者是喉簇音 "eh" 個時陣
            else if (!rhymingTarget.coda || rhymingTarget.coda === 'h') {
                if (options.SameArticulationPart) {
                    // 同部位發音：無尾音 (NULL) 參入聲喉塞音 ('h') 算做一組
                    codaStr = ` AND (s.coda IS NULL OR s.coda = 'h') `; 
                } else {
                    // 精確比對：無尾音就揣 NULL，有 'h' 就揣 'h'
                    codaStr = rhymingTarget.coda ? ` AND s.coda = 'h' ` : ` AND s.coda IS NULL `;
                }
            } 
            else {
                // 其他 'e' 結尾個情況 (基本比對)
                codaStr = ` AND s.coda = '${rhymingTarget.coda}' `;
            }
        } 
        // 韻母毋是 'e' 個一般情況
        else {
            if (options.SameArticulationPart) {
                // 一般韻母個「同部位發音」：無尾音參 'h' 先處理
                if (!rhymingTarget.coda || rhymingTarget.coda === 'h') {
                    codaStr = ` AND (s.coda IS NULL OR s.coda = 'h') `;
                } else {
                    // 照發音部位對照表 (譬如 m/p, n/t, ng/k) 來揣
                    const arts = SameArituculationPartCodas[rhymingTarget.coda] || [rhymingTarget.coda];
                    codaStr = ` AND s.coda IN (${arts.map((c) => `'${c}'`).join(', ')}) `;
                }
            } else {
                // 一般精確比對：無尾音揣 NULL，有尾音揣原值
                codaStr = rhymingTarget.coda ? ` AND s.coda = '${rhymingTarget.coda}' ` : ` AND s.coda IS NULL `;
            }
        }
    }
    return `(ws.rev_order = ${index+1}` + toneStr + vowelStr + nasalStr + codaStr+`)`;
}

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
            if(coda==='k' || coda==='ng'){ // "eng", "ek" ê sî chūn
                if(!opts.IgnoreFinalSound) whereCondition.coda = coda; // Nā bô bû sī coda, tio̍h ài thai coda.
                else whereCondition.coda = ['k','ng']; // Nā ū bû sī coda, kan ta hān tī "eng", "ek" chi kan, in ūi "eh", "e" ê "e" kiau "eng", "ek" ê "e" bô kâng im.
            }
        }else{
            if(!opts.IgnoreFinalSound){ // Nā bô bû sī chiah ū ē bīn ê būn tê
                if(opts.SameArticulationPart){
                    if(coda==='p' || coda==='m'){
                            whereCondition.coda = ['p','m'];
                    }else if(coda==='t' || coda==='n'){
                        whereCondition.coda = ['t','n'];
                    }else if(coda==='k' || coda==='ng'){
                        whereCondition.coda = ['k','ng'];
                    }else if(coda==='h'){
                        whereCondition.coda = ['h', null];
                    }
                }else{
                    whereCondition.coda = coda;
                }
            }
            // Nā ū bû sī tio̍h kā lóng chóng ê kiat kó show chhut lâi.
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

export const wordRhymingByInputLecagy = async (req: Request, res: Response, next: NextFunction) => {
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

export const wordRhymingByWordLegacy = async (req: Request, res: Response, next: NextFunction) => {
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
        }
        if(typeof hanjiKip === 'string' && hanjiKip){
            whereCondition.hanjiKip = hanjiKip;
        }
        if(lomaji === undefined && hanjiKip === undefined){
            res.status(400).json({message: 'lomaji or hanjiKip is required.', successuful: true});
            return;
        }

        await Statistics.increment('value', { by: 1, where: { key: 'search_counter' } });
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
            attributes: ['lomaji', 'hanjiKip'],
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
        }
        if(typeof hanjiKip === 'string' && hanjiKip){
            whereCondition.hanjiKip = hanjiKip;
        }
        if(lomaji === undefined && hanjiKip === undefined){
            res.status(400).json({message: 'lomaji or hanjiKip is required.', successuful: true});
            return;
        }

        await Statistics.increment('value', { by: 1, where: { key: 'search_counter' } });
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

        if(!keyword && hanjiKip !== undefined){
            res.status(404).json({ message: 'No matching word found.', successful: false });
            return;
        }

        const getSyllables = () : Syllable[] => {
            if (hanjiKip !== undefined && keyword){
                const links = keyword.toJSON().wordLinks;
                if(!links) return [];

                return links.map(wordLinkData => wordLinkData.syllable!);
            }else if(typeof lomaji === 'string'){
                const syllableArr = getLomajiArr(lomaji);
                return syllableArr.map(syllable=>({
                    lomaji: syllable,
                    vowel: getVowel(syllable),
                    coda: getCoda(syllable),
                    nasal: getNasal(syllable),
                    tone: getTone(syllable),
                }) as Syllable);
            }
            return [];
        };
        const syllables : Syllable[] = getSyllables();
        if(!syllables || syllables.length===0){
            res.status(400).json({
                message: 'Could not resolve syllables from input.',
                successful: false,
            });
        }

        let conditionString = ``;
        for(let i=0; i<Number(rhymingSyllableCount); i++){
            if(i>0) conditionString += ` OR `;
            conditionString += getRhymingCondition(i, (syllables!.at(syllables!.length-i-1))!, opts);
        }
        const excludeCondition = keyword ? `w.id !=${keyword.id}` : `1=1`;
        const query = `
            SELECT w.lomaji, w.hanji_kip AS hanjiKip FROM words AS w
            INNER JOIN WordSyllables AS ws ON w.id = ws.word_id
            INNER JOIN syllables AS s ON ws.syllable_id = s.id
            WHERE ${excludeCondition} AND ${conditionString}
            GROUP BY w.id
            HAVING COUNT(*) = ${rhymingSyllableCount};
        `;
        interface RhymeResult {
            lomaji: string;
            hanjiKip: string;
        }
        const results = await db.sequelize.query<RhymeResult>(query, {
            type: QueryTypes.SELECT,
            raw: true,
        });
        console.log(results);

        if(Array.isArray(results) && results.length > 0){
            res.status(200).json({ successful: true, count: results.length,  data: results});
        }else{
            res.status(200).json({ message: 'No rhyming words found matching the criteria.', successful: true});
        }

    } catch (error) {
        next(error);
    }
};