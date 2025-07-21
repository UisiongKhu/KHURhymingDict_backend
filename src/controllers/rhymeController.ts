import { Request, Response, NextFunction } from 'express';
import { Op, where } from 'sequelize';
import db from '../models';
import { get } from 'http';


export const getRhymeList = async (req : Request, res : Response, next : NextFunction) => {
    try {
        const rhymes = await db.Rhyme.findAll();
        if(!rhymes || rhymes.length === 0) {
            res.status(404).json({message: "No rhyme founded."});
        }
        res.status(200).json(rhymes.map(item=>item.toJSON()));
    } catch (error) {
        next(error);
    }
};

export const getRhyme = async (req : Request, res : Response, next : NextFunction) => {
    try {
        const rhyme = await db.Rhyme.findAll({
            where: {
                lomaji: req.params.lomaji,
            }
        });
        if(!rhyme){
            res.status(404).json({message: "No rhyme founded, check the parameter."})
        }
        res.status(200).json(rhyme.map(item=>item.toJSON()));
    } catch (error) {
        next(error);
    }
};
export const initRhymes = async (req : Request, res : Response, next : NextFunction) => {
    const codaList = ['ng', 'p', 't', 'k', 'h', 'm', 'n'];
    const vowelList = ['iau', 'oai', 'ai', 'au', 'ia', 'iu', 'io', 'oa', 'oe', 'ui', 'a', 'i', 'u', 'o͘', 'e', 'o'];
    const getVowel = (rhyme : string) => {
        for(const vowel of vowelList){
            if(rhyme.includes(vowel)){
                return vowel;
            }
        }
        if(rhyme.endsWith('m') || rhyme.endsWith('mh')) return 'm';
        if(rhyme.endsWith('ng') || rhyme.endsWith('ngh')) return 'ng';
        return "";
    };
    const getCoda = (rhyme : string) => {
        const vowel = getVowel(rhyme);
        for(const coda of codaList){
            if(vowel === 'm' || vowel === 'ng' ){
                if(rhyme.replace('ⁿ','').endsWith('h'))
                    return 'h';
            }else{
                if(rhyme.replace('ⁿ','').endsWith(coda))
                    return coda;
            }
        }
        return null;
    };
    const getNasal = (rhyme : string) => {
        return rhyme.includes('ⁿ');
    };
    const getDataCounts = () => {
        return 0;
    };
    const allRhymes = [
            // 韻腹 [a]
            "a", "aⁿ", "am", "an", "ang", "ap", "at", "ak", "ah", "ahⁿ",

            // 韻腹 [ai]
            "ai", "aiⁿ", "aih", "aihⁿ",

            // 韻腹 [au]
            "au", "auh",

            // 韻腹 [e]
            "e", "eⁿ", "eh", "ehⁿ",

            // 韻腹 [i]
            "i", "im", "in", "ip", "it", "ih", "ihⁿ",

            // 韻腹 [ia]
            "ia", "iaⁿ", "iam", "ian", "iap", "iat", "iak", "iah", "iahⁿ",

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
            "o͘", "oⁿ", "om", "ong", "ohⁿ", "ok",

            // 韻腹 [oa]
            "oa", "oaⁿ", "oan", "oat", "oah",

            // 韻腹 [oai]
            "oai", "oaiⁿ",

            // 韻腹 [oe]
            "oe", "oeh",

            // 韻腹 [u]
            "u", "un", "ut", "uh",

            // 韻腹 [ui]
            "ui",

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
            "歐", "𩛩",

            // 韻腹 [e]
            "矮", "嬰", "厄", "",

            // 韻腹 [i]
            "伊", "音", "因", "入", "食", "滴", "",

            // 韻腹 [ia]
            "命", "影", "鹽", "緣", "葉", "擛", "摔", "頁", "",

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
            "烏", "", "參", "王", "", "惡",

            // 韻腹 [oa]
            "沙", "官", "遠", "越", "活",

            // 韻腹 [oai]
            "歪", "關",

            // 韻腹 [oe]
            "話", "郭",

            // 韻腹 [u]
            "羽", "韻", "鬱", "欶",

            // 韻腹 [ui]
            "為",

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
            console.log(`Creating data for ${lomaji}`);

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