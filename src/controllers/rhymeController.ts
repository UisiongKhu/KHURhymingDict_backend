import { Request, Response, NextFunction } from 'express';
import { Op, where } from 'sequelize';
import db from '../models';
import { getCoda, getNasal, getVowel } from '../utils/utils';

/**
 * getRhyme
 * Ēng lâi chhiau chhōe ta̍k ūn bó ê chu liāu.
 * @param req Ùi req.query chiap siu chham sò͘ thang ùi DB chhiau chhōe chu liāu
 * @param res Thoân HTTP ê hôe èng tńg khì, JSON ē pau chu liāu a̍h sī sìn sit, koh ū sêng kong ê phiau kì.
 * @param next 
 */
export const getRhyme = async (req : Request, res : Response, next : NextFunction) => {
    try {
        const {id, lomaji, hanji, vowel, coda, nasal, desc} = req.query;
        const whereCondition : {[key : string]: any} = {};
        if(typeof id ==='string' && id) whereCondition.id = id;
        if(typeof lomaji ==='string' && lomaji) whereCondition.lomaji = lomaji;
        if(typeof hanji ==='string' && hanji) whereCondition.hanji = hanji;
        if(typeof vowel ==='string' && vowel) whereCondition.vowel = vowel;
        if(typeof coda ==='string' && coda) whereCondition.coda = coda;
        if(typeof nasal ==='string' && nasal) {
            if(nasal.toLowerCase()==='true') whereCondition.nasal = true;
            else if(nasal.toLowerCase()==='false' || nasal === '') whereCondition.nasal = false;
        }else if(nasal !== undefined) {
            whereCondition.nasal = true;
        }
        if(typeof desc ==='string' && desc) whereCondition.desc = desc;
        const rhymes = await db.Rhyme.findAll({where: whereCondition});
        if(!rhymes || rhymes.length === 0) {
            res.status(404).json({message: "No rhyme founded.", successful : false});
        }
        res.status(200).json(rhymes.map(item=>item.toJSON()));
    } catch (error) {
        next(error);
    }
};

/**
 * initRhymes
 * Ēng lâi reset DB lāi té ê ūn bó chu liāu (khai hoat iōng).
 * @param req Ùi req.query chiap siu chham sò͘ thang ùi DB chhiau chhōe chu liāu
 * @param res Thoân HTTP ê hôe èng tńg khì, JSON ē pau chu liāu a̍h sī sìn sit, koh ū sêng kong ê phiau kì.
 * @param next 
 */
export const initRhymes = async (req : Request, res : Response, next : NextFunction) => {
    
    const getDataCounts = () => {
        return 0;
    };
    const allRhymes = [
            // 韻腹 [a]
            "a", "aⁿ", "am", "an", "ang", "ap", "at", "ak", "ah", "ahⁿ",

            // 韻腹 [ai]
            "ai", "aiⁿ", "aih", "aihⁿ",

            // 韻腹 [au]
            "au", "auh", "auⁿ", "auhⁿ",

            // 韻腹 [e]
            "e", "eⁿ", "eh", "ehⁿ",

            // 韻腹 [i]
            "i", "iⁿ", "im", "in", "ip", "it", "ih", "ihⁿ",

            // 韻腹 [ia]
            "ia", "iaⁿ", "iam", "ian", "iang", "iap", "iat", "iak", "iah", "iahⁿ",

            // 韻腹 [iau]
            "iau", "iauⁿ", "iauh",

            // 韻腹 [io]
            "io", "eng", "ek", "ioh",

            // 韻腹 [iong]
            "iong", "iok",

            // 韻腹 [iu]
            "iu", "iuⁿ", "iuh", "iuhⁿ",

            // 韻腹 [ə]/[o]
            "o", "oh",

            // 韻腹 [ɔ]
            "o͘", "o͘h", "oⁿ", "om", "ong", "ohⁿ", "ok", "op",

            // 韻腹 [oa]
            "oa", "oaⁿ", "oan", "oang", "oat", "oah",

            // 韻腹 [oai]
            "oai", "oaiⁿ",

            // 韻腹 [oe]
            "oe", "oeh", "oeⁿ",

            // 韻腹 [u]
            "u", "un", "ut", "uh",

            // 韻腹 [ui]
            "ui", "uih", "ûiⁿ",

            // 特殊韻母 [m] (自成音節)
            "m", "mh",

            // 特殊韻母 [ng] (自成音節)
            "ng", "ngh"
        ];
        const allRhymesExample = [
            // 韻腹 [a]
            "巴", "三", "掩", "安", "紅", "壓", "遏", "握", "鴨", "唅",

            // 韻腹 [ai]
            "哀", "喈", "哎", "",

            // 韻腹 [au]
            "歐", "𩛩", "腦" ,"卯",

            // 韻腹 [e]
            "矮", "嬰", "厄", "",

            // 韻腹 [i]
            "伊", "嬰" , "音", "因", "入", "食", "滴", "",

            // 韻腹 [ia]
            "命", "影", "鹽", "緣", "央", "葉", "擛", "摔", "頁", "",

            // 韻腹 [iau]
            "夭", "", "",

            // 韻腹 [io]
            "腰", "英", "易", "臆",

            // 韻腹 [iong]
            "用", "欲",

            // 韻腹 [iu]
            "右", "洋", "", "",

            // 韻腹 [ə]/[o]
            "高", "學",

            // 韻腹 [ɔ]
            "烏", "膜", "", "參", "王", "", "惡", "橐",

            // 韻腹 [oa]
            "沙", "官", "遠", "嚾", "越", "活",

            // 韻腹 [oai]
            "歪", "關",

            // 韻腹 [oe]
            "話", "郭", "妹",

            // 韻腹 [u]
            "羽", "韻", "鬱", "欶",

            // 韻腹 [ui]
            "為", "血", "梅",

            // 特殊韻母 [m] (自成音節)
            "毋", "",

            // 特殊韻母 [ng] (自成音節)
            "黃", ""
        ] ;
    console.log('allRhymes.length:', allRhymes.length); // <-- 加這行
    console.log('First few rhymes:', allRhymes.slice(0, 5)); // <-- 加這行
    try {
        await db.Rhyme.destroy({
            truncate: true
        });
        for(let i = 0; i<allRhymes.length;i++) {
            const lomaji = allRhymes[i];
            console.log(`Creating data for ${lomaji}, 
                vowel=${getVowel(lomaji)}, 
                coda=${getCoda(lomaji)},
                nasal=${getNasal(lomaji)},
            }`);

            await db.Rhyme.create({
                lomaji: lomaji,
                hanji: (allRhymesExample[i]===""?null:allRhymesExample[i]),
                vowel: getVowel(lomaji),
                coda: getCoda(lomaji),
                nasal: getNasal(lomaji),
                dataCounts: getDataCounts(),
            })
        }
        const rhymes = await db.Rhyme.findAll();
        res.status(200).json(rhymes.map(item=>item.toJSON()));
    } catch (error) {
       console.log(`Error from initRhymes(): ${error}`); 
    }
}
