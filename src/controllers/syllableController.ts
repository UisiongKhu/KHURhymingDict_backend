import { Request, Response, NextFunction } from 'express';
import { Op, where } from 'sequelize';
import db from '../models';
import syllable, { Syllable, SyllableCreateAttribute } from '../models/syllable';
import sequelize from 'sequelize';


/**
 * getSyllable
 * Ēng lâi chhiau chhōe im chat ê chu liāu.
 * @param req Ùi req.query chiap siu chham sò͘ thang ùi DB chhiau chhōe chu liāu
 * @param res Thoân HTTP ê hôe èng tńg khì, JSON ē pau chu liāu a̍h sī sìn sit, koh ū sêng kong ê phiau kì.
 * @param next 
 * @type GET
 */
export const getSyllable = async (req : Request, res : Response, next : NextFunction) => {
    try {
        const {id, lomaji, hanjiKip, hanjiClj, consonant, vowel, coda, tone, nasal, desc} = req.query;
        const whereCondition : {[key:string]:any} = {};
        if(typeof id === 'string' && id) whereCondition.id = id;
        if(typeof lomaji === 'string' && lomaji) whereCondition.lomaji = lomaji;
        if(typeof hanjiKip === 'string' && hanjiKip) whereCondition.hanjiKip = hanjiKip;
        if(typeof hanjiClj === 'string' && hanjiClj) whereCondition.hanjiClj = hanjiClj;
        if(typeof consonant === 'string' && consonant) whereCondition.consonant = consonant;
        if(typeof vowel === 'string' && vowel) whereCondition.vowel = vowel;
        if(typeof coda === 'string' && coda) whereCondition.coda = coda;
        if(typeof tone === 'string' && tone) whereCondition.tone = tone;
        if(typeof nasal ==='string' && nasal) {
            if(nasal.toLowerCase()==='true') whereCondition.nasal = true;
            else if(nasal.toLowerCase()==='false' || nasal === '') whereCondition.nasal = false;
        }else if(nasal !== undefined) {
            whereCondition.nasal = true;
        }
        if(typeof desc === 'string' && desc) whereCondition.desc = desc;
        const syllables = await db.Syllable.findAll({
            where: whereCondition
        });
        if(!syllables || syllables.length===0){
            res.status(404).json({message: 'No syllable founded.'});
            return;
        }
        res.status(200).json(syllables.map(item=>item.toJSON()));
    } catch (error) {
        console.error('The̍h Syllable lia̍t toaⁿ ê sî tn̄g tio̍h būn tê: ', error);
        next(error);
    }
}

/**
 * addSyllable
 * Ēng lâi ke thiⁿ im chat ê chu liāu.
 * @param req Ùi req.body chiap siu chham sò͘ thang ùi DB ke thiⁿ chu liāu
 * @param res Thoân HTTP ê hôe èng tńg khì, JSON ē pau chu liāu a̍h sī sìn sit, koh ū sêng kong ê phiau kì.
 * @param next 
 * @type POST
 */
export const addSyllable = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        // Soeh bêng: Tī leh cheng ka chi̍t ê Im chat ê sî ài kā i só͘ tùi èng ê rhymes chu liāu lia̍t toaⁿ lāi té ê dataCounts thiⁿ 1.
        const {lomaji, hanjiKip, hanjiClj, consonant, vowel, coda, tone, nasal, desc} = req.body;
        if(!lomaji){
            return next(new Error('Field "lomaji" is needed.'));
        }
        const newSyllableData : SyllableCreateAttribute = {
            lomaji: lomaji,
            hanjiKip: hanjiKip || null,
            hanjiClj: hanjiClj || null,
            consonant: consonant || null,
            vowel: vowel,
            coda: coda || null,
            tone: tone,
            nasal: nasal,
            desc: desc || null, 
        }

        // Ke thiⁿ chìn chêng ài seng kiám cha kám í keng ū sio kâng ê chu liāu.
        const checkSyllable = await db.Syllable.findOne({
            where: newSyllableData,
            transaction
        });
        if(checkSyllable){
            await transaction.rollback();
            res.status(409).json({message: 'Í keng ū sio kâng ê chu liāu ah, chhiáⁿ koh kiám cha Request ê lōe iông.', successful: false});
            return;
        }

        const newSyllable = await db.Syllable.create(newSyllableData,{transaction});

        const affectedObj = await db.Rhyme.increment({
            dataCounts: 1,
        },{
            where: {
                vowel: vowel,
                coda: coda,
                nasal: nasal,
            }
            ,transaction
        });
        console.log(affectedObj);
        const affectedCount = affectedObj.at(0)![1];
        if (affectedCount === 0){
            const error = new Error('Bô tùi èng ê Rhyme chu liāu, chhiàⁿ koh kiám cha lí ê Request.');
            await transaction.rollback();
            (error as any).status = 404
            return next(error);
        }else if (affectedCount === 1){
            await transaction.commit();
            res.status(200).json({
                message: 'Syllable ke thiⁿ kap Rhyme ê dataCounts update sêng kong.',
                newSyllable: newSyllable,
                successful: true,
            })
        }else{
            const error = new Error('Rhyme chu liāu pió ū chhiau kòe 1 hāng kāng ūn bó ê chu liāu, chhiáⁿ kiám cha DB.');
            await transaction.rollback();
            (error as any).status = 400;
            return next(error);
        }
    } catch (error) {
        await transaction.rollback();
        console.error('Ke thiⁿ Syllable chu liāu ê sî tn̄g tio̍h būn tê: ', error);
        next(error);
    }
}

/**
 * updateSyllable
 * Ēng lâi update im chat ê chu liāu.
 * @param req Ēng req.query chò update ê tiâu kiāⁿ, req.body chò update ê chu liāu.
 * @param res Thoân HTTP ê hôe èng tńg khì, JSON ē pau chu liāu a̍h sī sìn sit, koh ū sêng kong ê phiau kì.
 * @param next 
 * @type POST
 */
export const updateSyllable = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { lomaji, hanjiKip, hanjiClj, consonant, vowel, coda, tone, nasal, desc} = req.body;
        const {id: targetId} = req.params;
        const updateValue : {[key:string]:any} = {};
        if(typeof lomaji === 'string' && lomaji) updateValue.lomaji = lomaji;
        if(typeof hanjiKip === 'string' && hanjiKip) updateValue.hanjiKip = hanjiKip;
        if(typeof hanjiClj === 'string' && hanjiClj) updateValue.hanjiClj = hanjiClj;
        if(typeof consonant === 'string' && consonant) updateValue.consonant = consonant;
        if(typeof vowel === 'string' && vowel) updateValue.vowel = vowel;
        if(typeof coda === 'string' && coda) updateValue.coda = coda;
        if(typeof tone === 'string' && tone) updateValue.tone = tone;
        if(typeof nasal ==='string' && nasal) {
            if(nasal.toLowerCase()==='true') updateValue.nasal = true;
            else if(nasal.toLowerCase()==='false' || nasal === '') updateValue.nasal = false;
        }else if(nasal !== undefined) {
            updateValue.nasal = true;
        }
        if(typeof desc === 'string' && desc) updateValue.desc = desc;

        const checkSyllable = await db.Syllable.findOne({
            where: updateValue,
            transaction,
        });

        if(checkSyllable){
            await transaction.rollback();
            res.status(409).json({message: 'Í keng ū sio kâng ê chu liāu ah, chhiáⁿ koh kiám cha Request ê lōe iông.', successful: false});
            return;
        }

        const syllables = await db.Syllable.update(updateValue,{where: {id: targetId}, transaction});
        if(syllables.at(0)===0){
            await transaction.rollback();
            res.status(404).json({message: 'No syllable founded.', successful: false});
            return;
        }else{
            await transaction.commit();
            res.status(200).json({message: 'Syllable updated.', successful: true});
            return;
        }
    } catch (error) {
            await transaction.rollback();
        console.error('The̍h Syllable lia̍t toaⁿ ê sî tn̄g tio̍h būn tê: ', error);
        next(error);
    }
}

/**
 * deleteSyllable
 * Ēng lâi thâi im chat ê chu liāu. It tēng ài ū lomaji, vowel, nasal.
 * Chiah thang sīn sòa kā Rhymes lia̍t toaⁿ lāi ê dataCounts kiám khí lâi.
 * @param req Ēng req.query chò update ê tiâu kiāⁿ, req.body chò update ê chu liāu.
 * @param res Thoân HTTP ê hôe èng tńg khì, JSON ē pau chu liāu a̍h sī sìn sit, koh ū sêng kong ê phiau kì.
 * @param next 
 * @type DELETE
 */
export const deleteSyllable = async (req : Request, res : Response, next : NextFunction) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {id: targetId} = req.params;
        console.log(`開始卜刣音節資料、指定 ID：${targetId}`);
        const targetIdString = targetId.toString();
        const target = await db.Syllable.findByPk(targetId);
        if(!target){
            await transaction.rollback();
            res.status(404).json({message: 'Chhōe bô lí beh ài hiat ka̍k ê chu liāu.', successful: false});
            return;
        }

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


        const wordsToDestroy = await db.Word.findAll({
            where: {
                syllableIds: condition,
            },
            transaction,
        });


        if(wordsToDestroy && wordsToDestroy.length > 0){
            console.log(`順紲卜刣个詞彙資料：${wordsToDestroy}`);
            // 使用 Promise.all 加速刪除多個 word
            const destroyPromises = wordsToDestroy.map(word => word.destroy({transaction}));
            await Promise.all(destroyPromises);
        }


        const syllable = await db.Syllable.destroy({where: {id: targetId}, transaction});
        if(syllable===0){
            await transaction.rollback();
            res.status(404).json({message: 'Chhōe bô lí beh ài hiat ka̍k ê chu liāu.', successful: false});
        }else{
            const affectedObj = await db.Rhyme.increment({
                dataCounts: -syllable,
            },{
                where: {
                    vowel: target.vowel,
                    coda: target.coda,
                    nasal: target.nasal,
                },
                transaction
            })
            if(affectedObj.at(0)![1]===0){
                await transaction.rollback();
                res.status(404).json({message: 'Chhōe bô Rhyme ê tùi èng chu liāu. Chhiáⁿ kiám cha dataCounts lân ūi kám tio̍h.'});
                return;
            }else{
                await transaction.commit();
                res.status(200).json({message: 'Syllable Deleted.', successful: true});
            }
        }

    } catch (error) {
        await transaction.rollback();
        next(error);
    }
}

//select * from words WHERE syllable_ids = "[7]" OR (syllable_ids NOT LIKE "[7]" AND syllable_ids LIKE "%,7,%") OR syllable_ids LIKE "[7,%" OR syllable_ids LIKE "%,7]";
