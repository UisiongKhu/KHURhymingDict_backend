import { Request, Response, NextFunction } from 'express';
import { Op, where } from 'sequelize';
import db from '../models';
import word, { WordCreateAttribute } from '../models/word';
import * as fs from 'fs';
import csv from 'csv-parser';
import { getHanjiKipArr, getLomajiArr, getNaturalToneMarkIndex, isHanji } from '../utils/utils';
import { fileURLToPath } from 'url';

export const getWord = async (req : Request, res : Response, next : NextFunction ) => {
    try {
        const {id, lomaji, hanjiKip, hanjiClj, syllableIds, natureToneMark, desc} = req.query;
        const whereCondition : {[key : string] : any} = {};
        if(typeof id === 'string' && id) whereCondition.id = id;
        if(typeof lomaji === 'string' && lomaji) whereCondition.lomaji = lomaji;
        if(typeof hanjiKip === 'string' && hanjiKip) whereCondition.hanjiKip = hanjiKip;
        if(typeof hanjiClj === 'string' && hanjiClj) whereCondition.hanjiClj = hanjiClj;
        if(typeof natureToneMark === 'string' && natureToneMark) whereCondition.natureToneMark = natureToneMark;
        if(typeof desc === 'string' && desc) whereCondition.desc = desc;

        if(typeof syllableIds === 'string' && syllableIds) whereCondition.syllableIds = syllableIds;
        
        console.log(whereCondition);
        const words = await db.Word.findAll({
            where:whereCondition
        });
        if(!words || words.length === 0) {
            res.status(404).json({
                message: 'Chhōe bô lí beh ài ê sû lūi. / No word founded.',
                successful: false,
            });
            return;
        }else{
            res.status(200).json(words.map(item=>item.toJSON()));
            return;
        }
    } catch (error) {
        console.error('The̍h Word lia̍t toaⁿ ê sî chūn tn̄g tio̍h būn tê: ', error);
        next(error);
    }
};

export const getWordWithSyllables = async (req : Request, res : Response, next : NextFunction ) => {
    try {
        const {id, lomaji, hanjiKip, hanjiClj, syllableIds, natureToneMark, desc} = req.query;
        const whereCondition : {[key : string] : any} = {};
        if(typeof id === 'string' && id) whereCondition.id = id;
        if(typeof lomaji === 'string' && lomaji) whereCondition.lomaji = lomaji;
        if(typeof hanjiKip === 'string' && hanjiKip) whereCondition.hanjiKip = hanjiKip;
        if(typeof hanjiClj === 'string' && hanjiClj) whereCondition.hanjiClj = hanjiClj;
        if(typeof natureToneMark === 'string' && natureToneMark) whereCondition.natureToneMark = natureToneMark;
        if(typeof desc === 'string' && desc) whereCondition.desc = desc;

        if(typeof syllableIds === 'string' && syllableIds) whereCondition.syllableIds = syllableIds;
        
        console.log(whereCondition);
        const word = await db.Word.findOne({
            where: {...whereCondition},
            attributes: ['id', 'lomaji', 'hanjiKip'],
            include: [{
                model: db.WordSyllables,
                as: 'wordLinks',
                attributes: ['order'],
                include: [{
                    model: db.Syllable,
                    as: 'syllable',
                    attributes: ['id', 'lomaji', 'hanjiKip', 'vowel', 'coda', 'tone'],
                }],
            }],
            order: [[{model: db.WordSyllables, as: 'wordLinks'}, 'order', 'ASC']],
        });
        if(!word) {
            res.status(404).json({
                message: 'Chhōe bô lí beh ài ê sû lūi. / No word founded.',
                successful: false,
            });
            return;
        }else{
            res.status(200).json(word.toJSON());
            return;
        }
    } catch (error) {
        console.error('The̍h Word lia̍t toaⁿ ê sî chūn tn̄g tio̍h būn tê: ', error);
        next(error);
    }
};

export const addWord = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {lomaji, hanjiKip, hanjiClj, syllableIds, natureToneMark, desc} = req.body;

        if(!lomaji || !syllableIds || !Array.isArray(syllableIds)){
            await transaction.rollback();
            res.status(400).json({message: '"lomaji" a̍h sī "syllableIds" ū têng tâⁿ, chhiáⁿ koh kiám cha Request ê lōe iông.', successful: false});
        }

        const numericSyllableIds = syllableIds.map(item => parseInt(item, 10)).filter(item => !isNaN(item));

        const standardizedSyllableIds = JSON.stringify(numericSyllableIds);


        const newWordData : WordCreateAttribute = {
            lomaji,
            hanjiKip: hanjiKip || null,
            hanjiClj: hanjiClj || null,
            syllableIds: standardizedSyllableIds,
            natureToneMark: natureToneMark || null,
            desc: desc || null,
        }

        const checkWord = await db.Word.findOne({
            where: {
                lomaji,
                hanjiKip,
                hanjiClj,
                syllableIds: standardizedSyllableIds,
                natureToneMark,
            },
            transaction,
        });
        if(checkWord){
            await transaction.rollback();
            res.status(409).json({message: 'Í keng ū sio kâng ê chu liāu ah, chhiáⁿ koh kiám cha Request ê lōe iông.', successful: false});
            return;
        }

        const newWord = await db.Word.create(newWordData, {transaction});
        if(!newWord){
            await transaction.rollback();
            res.status(500).json({
                message: 'Khí chō sû lūi chu liāu ê sî tn̄g tio̍h būn tê.',
                successful: false,
            });
            return;
        }else{
            await transaction.commit();
            res.status(201).json({
                newWord: newWord,
                successful: true,
            });
            return;
        }
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

export const updateWord = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {lomaji, hanjiKip, hanjiClj, syllableIds, natureToneMark, desc} = req.body;
        const { id: targetId} = req.params;
        const updateValue : {[key:string]:any} = {};
        let numericSyllableIds : number[];
        let standardizedSyllableIds : string;
        if(typeof lomaji === 'string' && lomaji) updateValue.lomaji = lomaji;
        if(typeof hanjiKip === 'string' && hanjiKip) updateValue.hanjiKip = hanjiKip;
        if(typeof hanjiClj === 'string' && hanjiClj) updateValue.hanjiClj = hanjiClj;
        if(typeof natureToneMark === 'string' && natureToneMark) updateValue.natureToneMark = natureToneMark;
        if(typeof desc === 'string' && desc) updateValue.desc = desc;

        if(Array.isArray(syllableIds)){
            numericSyllableIds = syllableIds.map(item=> parseInt(item, 10)).filter(item => !isNaN(item));
            standardizedSyllableIds = JSON.stringify(numericSyllableIds);
            updateValue.syllableIds = standardizedSyllableIds;
        }else{
            await transaction.rollback();
            res.status(400).json({message: '"syllableIds" ū têng tâⁿ, chhiáⁿ koh kiám cha Request ê lōe iông.', successful: false});
        }
        
        const checkWord = await db.Word.findOne({
            where: updateValue,
            transaction,
        });
        if(checkWord){
            await transaction.rollback();
            res.status(409).json({message: 'Í keng ū sio kâng ê chu liāu ah, chhiáⁿ koh kiám cha Request ê lōe iông.', successful: false});
            return;
        }

        const words = await db.Word.update(updateValue, {where: {id: targetId}, transaction});
        if(words.at(0)===0){
            await transaction.rollback();
            res.status(404).json({message: 'No word founded.', successful: false});
            return;
        }else{
            await transaction.commit();
            res.status(200).json({message: 'Word updated.', successful: true});
            return;
        }   
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
    
};

export const deleteWord = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {id: targetId} = req.params;
        const target = await db.Word.findByPk(targetId);
        if(!target){
            await transaction.rollback();
            res.status(404).json({message: 'Chhōe bô lí beh ài hiat ka̍k ê chu liāu', successful: false});
            return;
        }

        const word = await db.Word.destroy({where: {id: targetId}, transaction });
        if(word===0){
            await transaction.rollback();
            res.status(404).json({message: 'Chhōe bô lí beh ài hiat ka̍k ê chu liāu', successful: false});
            return;
        }else{
            await transaction.commit();
            res.status(200).json({message: 'Word Deleted.', successful: true});
        }
    } catch (error) {
        await transaction.rollback();
        next(error);
    }
};

export const test = async (req: Request, res : Response, next : NextFunction) => {
    const {id: targetId} = req.params;
    const targetIdString = targetId.toString();

    const condition = {
        [Op.or]: [
            // 第一種：陣列中只有一個元素，且該元素就是 targetId
            // 例如："[7]"
            { [Op.eq]: `[${targetIdString}]` },
            
            // 第二種：ID 在陣列的開頭，後面還有其他元素
            // 例如："[7,8,9]"
            { [Op.like]: `[${targetIdString},%` }, 

            // 第三種：ID 在陣列的結尾，前面還有其他元素
            // 例如："[4,5,7]"
            { [Op.like]: `%,${targetIdString}]` },

            // 第四種：ID 在陣列的中間
            // 例如："[1,7,8]"
            { [Op.like]: `%,${targetIdString},%` },
        ]
    };

    const target = await db.Word.findAll({
        where: {
            syllableIds: condition,
        }
    });

    if(target&&target.length>0){
        res.status(200).json({target: target, successful: true});
    }else{
        res.status(404).json({message: "Couldn't find the target.", successful: true});
    }
};

interface KIPWordData {
    DictWordID: string;
    PojUnicode: string;
    PojUnicodeOthers: string;
    PojInput: string;
    PojInputOthers: string;
    KipUnicode: string;
    KipUnicodeOthers: string;
    KipInput: string;
    KipInputOthers: string;
    HanLoTaibunKip: string;
    KipDictHanjiTaibunOthers: string;
    KipDictWordProperty: string;
    HoaBun: string;
    KaisoehHanLoPoj: string;
    KaisoehHanLoKip: string;
    KipDictDialects: string;
    Synonym: string;
    Opposite: string;
}

/**
 * Chū tōng chhōe Kàu Tián ê chu liāu kā sû lūi ji̍p ji̍p khì. Khah ke 5 im chat ê bē siu.
 * @param req 
 * @param res 
 * @param next 
 */
export const importWordKIP = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();

    try {
         const findSyllableIds = async (lomajiArr : string[], hanjiKipArr : string[]) => {
            const syllableIds : Array<number> = [];

            for(let i = 0;i<lomajiArr.length;i++){
                const lomaji = lomajiArr.at(i)!;
                const hanjiKip = hanjiKipArr.at(i);

                const whereCondition : {lomaji:string, hanjiKip?: string | null} = {
                    lomaji,
                }

                if(hanjiKip !== undefined) whereCondition.hanjiKip = hanjiKip;
                else whereCondition.hanjiKip = null;
                const result = await db.Syllable.findOne({
                    where: whereCondition,
                });
                if(result){
                    syllableIds.push(result.id);
                }
            }
            return syllableIds;
        };



        const wordFilePath = process.env.WORD_IMPORT_FILEPATH;
        const failedFilePath = process.env.WORD_IMPORT_FAILED_FILEPATH;
        console.log(process.cwd())
        if(wordFilePath !== undefined){
            const isWordFileExist = fs.existsSync(wordFilePath);
            if(isWordFileExist){
                const failedData : Array<{lomaji:string, hanjiKip:string, hanjiClj: any, syllableIds:any, natureToneMark:number|null}> = [];
                const proccessingPromises : Promise<any>[] = [];
                
                await new Promise<void>((resolve,reject)=>{
                    const stream = fs.createReadStream(wordFilePath);
                    stream.pipe(csv()).on('data', async (data: KIPWordData) => {
                        let word = {
                            lomaji: data.PojUnicode,
                            hanjiKip: data.HanLoTaibunKip,
                            hanjiClj: null,
                            syllableIds: null,
                            natureToneMark: getNaturalToneMarkIndex(data.PojUnicode),
                            desc: data.KaisoehHanLoPoj
                        };

                        //console.log(word);
                        const lomajiArr = getLomajiArr(word.lomaji);
                        const hanjiKipArr = getHanjiKipArr(word.hanjiKip);
                        
                        proccessingPromises.push(
                            (async () => {
                                if(lomajiArr.length < 5 && hanjiKipArr.length < 5 && !isHanji(word.lomaji)){
                                    const syllableIds = await findSyllableIds(lomajiArr, hanjiKipArr);
                                    if(syllableIds.length === 0){
                                        failedData.push(word);
                                    }else{
                                        console.log(`lomaji=${word.lomaji}, hanjiKip=${word.hanjiKip}, syllableIds=${syllableIds}, natureToneMark=${word.natureToneMark}`);

                                        const standardizedSyllableIds = JSON.stringify(syllableIds);

                                        const existData = await db.Word.findOne({
                                            where: {
                                                syllableIds: standardizedSyllableIds,
                                                natureToneMark: word.natureToneMark,
                                            },
                                            transaction,
                                        })

                                        if(existData){
                                            failedData.push(word);
                                            return;                                  
                                        }

                                        const wordData : WordCreateAttribute = {
                                            lomaji: word.lomaji,
                                            hanjiKip: word.hanjiKip,
                                            syllableIds: standardizedSyllableIds,
                                            natureToneMark: word.natureToneMark,
                                        }
                                        await db.Word.create(wordData, {transaction});
                                    }
                                }else{
                                    failedData.push(word);
                                }
                            })()
                        )
                        
                    }).on('end', async ()=>{
                        console.log('Stream ended.');
                        await Promise.all(proccessingPromises);
                        console.log('OK');
                        resolve();
                    }).on('error', (err)=> {
                        console.log('Rejected');
                        reject(err);
                    });
                });

                console.log(failedData.length);
                const appendFailedData = async () =>{
                    try {
                        if(fs.existsSync(failedFilePath!)){
                            await fs.writeFile(failedFilePath!, '', ()=>{});
                        }
                        for(const data of failedData){
                            const line = `${data.lomaji}, ${data.hanjiKip}, ${data.syllableIds}, ${data.natureToneMark}\n`;
                            await fs.appendFile(failedFilePath!,line,()=>{});
                        }
                    } catch (error) {
                        console.error(error);
                    }
                };
                await appendFailedData();
                console.log(test);
                await transaction.commit();
                res.status(200).json({message: "nice", successful: true});
            }else{
                await transaction.rollback();
                res.status(404).json({message: "Couldn't find the word file.", successful: false});
            }
        }
    } catch (error) {
       await transaction.rollback();
       console.error(`From importWord(): `, error);
    }
       
}