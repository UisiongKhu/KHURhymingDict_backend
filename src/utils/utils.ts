/**
 * @file utils.ts
 * @author kus_tw Khu Ûi Siông
 * @description KHURHymingDict ê āu tâi só͘ su iàu ê li li khok khok ê function lóng tī chia.
 */

const codaList = ['ng', 'p', 't', 'k', 'h', 'm', 'n'];
const checkedToneCodaList = ['p','t','k','h'];
const vowelList = ['iau', 'oai', 'ai', 'au', 'ia', 'iu', 'io', 'oa', 'oe', 'ui', 'a', 'i', 'u', 'o͘', 'e', 'o'];
const consonantList = ['chh','ch','ph','th','kh','ng','p','t','k','b','l','g','m','n','j','s','h']
const toneMarkList = ['','\u0301','\u0300','','\u0302','','\u0304','\u030D','\u0306'];
const tonedLetters = {
    a: ['a','á','à','a','â','ǎ','ā','a̍','ă'],
    i: ['i','í','ì','i','î','ǐ','ī','i̍','ĭ'],
    u: ['u','ú','ù','u','û','ǔ','ū','u̍','ŭ'],
    o͘: ['o͘','ó͘','ò͘','o͘','ô͘','ǒ͘','ō͘','o̍͘','ŏ͘'],
    e: ['e','é','è','e','ê','ě','ē','e̍','ĕ'],
    o: ['o','ó','ò','o','ô','ǒ','ō','o̍','ŏ'],
    n: ['n','ń','ǹ','n','n̂','ň','n̄','n̍','n̆'],
    m: ['m','ḿ','m̀','m','m̂','m̌','m̄','m̍','m̆'],
}

export const getTone = (syllable: string): number | null => {
    // 1. 優先檢查有明確標記 ê 音調符號（比方講 á, à, â 這款）
    for (const baseVowel in tonedLetters) {
        if (Object.prototype.hasOwnProperty.call(tonedLetters, baseVowel)) {
            const toneVariants = tonedLetters[baseVowel];
            
            for (let i = 1; i < toneVariants.length; i++) {
                if (syllable.includes(toneVariants[i])) {
                    switch (i) {
                        case 1: return 2;
                        case 2: return 3;
                        case 4: return 5;
                        case 6: return 7;
                        case 7: return 8;
                        default:
                            break;
                    }
                }
            }
        }
    }
    
    // 2. 檢查敢有「特殊 ê 鼻化入聲」
    // 這款音節 ê 尾溜有 'hⁿ'，而且可能算是 4 聲
    if (syllable.endsWith('hⁿ')) {
        return 4;
    }
    
    // 3. 檢查敢有「一般 ê 入聲」尾韻
    // 這款是無鼻音 ê 4 聲，尾溜是 p, t, k, h
    const lastChar = syllable.slice(-1);
    if (checkedToneCodaList.includes(lastChar)) {
        return 4;
    }
    
    // 4. 檢查敢有「一般 ê 鼻音」
    // 這款音節 ê 尾溜是 'm', 'n', 'ng'，抑是音節內底有鼻化 ê 符號 'ⁿ'
    if (syllable.includes('ⁿ') || ['m', 'n', 'ng'].includes(syllable.slice(-2)) || ['m', 'n'].includes(syllable.slice(-1))) {
        // 若是無音調符號，鼻音通常是 1 聲
        return 1;
    }
    
    // 5. 處理其他無標記 ê 音節，預設是 1 聲
    return 1;
};

export const getCleanSyllable = (str : string) => {
    for(const vowel of Object.keys(tonedLetters)){
        for(let i=1;i<=8;i++){
            if(i===3) continue;
            str = str.replaceAll(tonedLetters[vowel][i],vowel);
        }
    }
    return str;
}

export const getConsonant = (str : string) => {
    str = getCleanSyllable(str);
    let _con = "";
    for(const consonant of consonantList){
        if(str.startsWith(consonant)){
            _con = consonant;
            break;
        }
    }
    if((str.endsWith('m') || str.endsWith('mh'))) {
        if(str.startsWith('m')){
            return '';
        }else{
            return _con;
        }
    }
    else if((str.endsWith('ng') || str.endsWith('ngh'))){
        if(str.startsWith('ng')){
            return '';
        }else{
            return _con;
        }
    }
    else return _con
}

export const getVowel = (str : string) => {
    str = getCleanSyllable(str);
    const consonant = getConsonant(str);
    if(consonant!=='' && consonant !== undefined){
        let strA = str.slice(0,consonant.length-1);
        const strB = str.slice(consonant.length);
        strA = strA.replaceAll(consonant,'');
        str = strA + strB;
    }
    for(const vowel of vowelList){
        if(str.includes(vowel)){
            if(vowel === 'o' || vowel === 'io'){
                const indexO = str.indexOf('o');
                console.log(`str=${str}, indexO = ${indexO}`);
                if(indexO!==str.length-1 && (str.at(indexO+1)==='k'||str.slice(indexO+1,indexO+3)==='ng'||str.slice(indexO+1,indexO+3)==='hⁿ'||str.at(indexO+1)==='m'||str.at(indexO+1)==='ⁿ')){
                    const vowelOu = vowel.replaceAll('o', 'o͘');
                    console.log(vowelOu);
                    return vowelOu;
                }else return vowel;
            }
            return vowel;
        }
    }
    if(str.endsWith('m') || str.endsWith('mh')) return 'm';
    if(str.endsWith('ng') || str.endsWith('ngh')) return 'ng';
    return "";
};
export const getCoda = (str : string) => {
    const vowel = getVowel(str);
    for(const coda of codaList){
        if(vowel === 'm' || vowel === 'ng' ){
            if(str.replace('ⁿ','').endsWith('h'))
                return 'h';
        }else{
            if(str.replace('ⁿ','').endsWith(coda))
                return coda;
        }
    }
    return null;
};
export const getNasal = (str : string) => {
    str = getCleanSyllable(str);
    const consonant = getConsonant(str);
    const vowel = getVowel(str);
    return str.includes('ⁿ')||consonant==='m'||consonant==='n'||vowel==='m'||vowel==='ng';
};
export const getNaturalToneMarkIndex = (str : string) => {
    const indexDash = str.indexOf('--');
    const indexDot1 = str.indexOf('．');    
    const indexDot2 = str.indexOf('‧');
    if(indexDash !== -1) return indexDash;
    if(indexDot1 !== -1) return indexDot1;
    if(indexDot2 !== -1) return indexDot2;
    return null;
};
export const getLomajiArr = (str : string) => {
    const lowercasedStr = str.toLowerCase();
    const cleanedStr = lowercasedStr.replace(/[-.,;?!–—]/g, ' ');
    const resultArr = cleanedStr.split(/\s+/).filter(word => word.length > 0);

    return resultArr;
};
export const getHanjiKipArr = (str : string) => {
    const cleanedStr = str.replace(/[，。！？；：「」……]/g,'');
    // Pún chiâⁿ ê hong hoat sī tī replace() ê āu piah thiⁿ split(''), m̄ koh án ne ē kā Unicode chhiau kòe FFFF ê jī goân chhiat chò 2 hūn.
    const regex = /./gu; // Lóng chóng ê jī goân.
    return [...cleanedStr.matchAll(regex)].map(match=>match[0]);
};
export const isHanji = (str : string) => {
    const regex =  /[\u4e00-\u9fa5\uF900-\uFAFF\u{20000}-\u{2A6DF}]/u;
    return regex.test(str);
};