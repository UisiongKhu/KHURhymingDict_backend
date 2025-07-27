/**
 * @file utils.ts
 * @author kus_tw Khu Ûi Siông
 * @description KHURHymingDict ê āu tâi só͘ su iàu ê li li khok khok ê function lóng tī chia.
 */

const codaList = ['ng', 'p', 't', 'k', 'h', 'm', 'n'];
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

export const getTone = (syllable : string) => {
    for(const vowel of Object.keys(tonedLetters)){
        for(let i=0;i<=8;i++){
            if(i===0) continue;
            if(i===3){
                const denasal = syllable.replaceAll('ⁿ','');
                if(denasal[denasal.length-1]==='h') return 4;
                continue;
            }
            if(syllable.includes(tonedLetters[vowel][i])) return i+1;
        }
    }
    return 1;
}

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
    const consonant = getConsonant(str);
    if(consonant!=='' && consonant !== undefined){
        let strA = str.slice(0,consonant.length-1);
        const strB = str.slice(consonant.length);
        strA = strA.replaceAll(consonant,'');
        str = strA + strB;
    }
    for(const vowel of vowelList){
        if(str.includes(vowel)){
            if(vowel in ['io', 'o']){
                const indexO = str.indexOf('o');
                if(indexO!==str.length-1 && str.at(indexO+1)==='h'){
                    return vowel.replaceAll('o', 'o͘');
                }
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