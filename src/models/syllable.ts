import { Model, Optional, DataTypes, Sequelize } from 'sequelize';
import { Word } from './word';
import { Op } from 'sequelize';

export type SyllableAttribute = {
    id: number,
    lomaji: string,
    hanjiKip: string | null,
    hanjiClj: string | null,
    consonant: string | null,
    vowel: string,
    coda: string | null,
    tone: number,
    nasal: boolean,
    desc: string | null,
    createdAt?: Date, // Sequelize ē chū tōng siat tēng sî kan ê phiau kì, só͘ í ē bīn ê init m̄ bián declare, m̄ koh chia iáu sī ài pó liû.
    updatedAt?: Date,
}

// Tēng gī bô it tēng ài siat ê chu liāu hāng.
export type SyllableCreateAttribute = Optional<SyllableAttribute, 'id' | 'consonant' | 'coda' | 'desc' | 'createdAt' | 'updatedAt' | 'hanjiKip' | 'hanjiClj' >;

// Tēng gī model ê attribute
export class Syllable extends Model<SyllableAttribute, SyllableCreateAttribute>{
    declare id : number;
    declare lomaji : string;
    declare hanjiKip : string;
    declare hanjiClj : string;
    declare consonant : string;
    declare vowel : string;
    declare coda : string;
    declare tone : number;
    declare nasal : boolean;
    declare desc : string;
    declare createdAt : Date;
    declare updatedAt : Date;
}

// Model Initialization
export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof Syllable => {
    Syllable.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        lomaji: {
            type: dataTypes.STRING,
            allowNull: false,
        },
        hanjiKip: {
            type: dataTypes.STRING,
            allowNull: true,
            field: 'hanji_kip',
        },
        hanjiClj: {
            type: dataTypes.STRING,
            allowNull: true,
            field: 'hanji_clj',
        },
        consonant: {
            type: dataTypes.STRING,
            allowNull: true,
        },
        vowel: {
            type: dataTypes.STRING,
            allowNull: false,
        },
        coda: {
            type: dataTypes.STRING,
            allowNull: true,
        },
        tone: {
            type: dataTypes.TINYINT.UNSIGNED,
            allowNull: false,
        },
        nasal: {
            type: dataTypes.BOOLEAN,
            allowNull: false,
        },
        desc: {
            type: dataTypes.TEXT,
            allowNull: true,
        },
    },{
        sequelize,
        tableName: 'syllables',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true,
        charset: 'utf8mb4'
    });

    /*Syllable.beforeDestroy(async (syllable, options) => {
        const syllableIdToDelete = syllable.id;
        const wordsToDestroy = await Word.findAll({
            where: {
                syllableIds: {
                    [Op.contains]: syllableIdToDelete.toString(),
                }
            }
        });

        if(wordsToDestroy.length > 0){
            console.log(`Tng teh thâi Syllable ID = ${syllableIdToDelete} ê chu liāu, ē sūn sòa thâi kiau i sio khan liân ê ${wordsToDestroy.length} ê sû lūi ê chu liāu.`);
            for(const word of wordsToDestroy){
                await word.destroy({transaction: options.transaction});
            }
        }
    });*/

    return Syllable;
};
