import { Model, Optional, DataTypes, Sequelize } from 'sequelize';
import { Syllable } from './syllable';
import { WordSyllables, WordSyllablesAttribute } from './wordSyllables';

type WordSyllablesAssociation = {
    wordLinks?: WordSyllablesAttribute[];
}

export type WordAttribute = {
    id: number,
    lomaji: string,
    hanjiKip: string | null,
    hanjiClj: string | null,
    syllableIds: string,
    natureToneMark: number | null,
    desc: string | null,
    createdAt?: Date, // Sequelize ē chū tōng siat tēng sî kan ê phiau kì, só͘ í ē bīn ê init m̄ bián declare, m̄ koh chia iáu sī ài pó liû.
    updatedAt?: Date,
} & WordSyllablesAssociation;


// Tēng gī bô it tēng ài siat ê chu liāu hāng.
export type WordCreateAttribute = Optional<WordAttribute, 'id' | 'desc' | 'createdAt' | 'updatedAt' | 'hanjiKip' | 'hanjiClj' | 'natureToneMark' >;

// Tēng gī model ê attribute
export class Word extends Model<WordAttribute, WordCreateAttribute>{
    declare id : number;
    declare lomaji : string;
    declare hanjiKip : string;
    declare hanjiClj : string;
    declare syllableIds: string;
    declare natureToneMark: number;
    declare desc : string;
    declare createdAt : Date;
    declare updatedAt : Date;
}

// Model Initialization
export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof Word => {
    Word.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        lomaji: {
            type: dataTypes.STRING(32),
            allowNull: false,
        },
        hanjiKip: {
            type: dataTypes.STRING(32),
            allowNull: true,
            field: 'hanji_kip',
        },
        hanjiClj: {
            type: dataTypes.STRING(32),
            allowNull: true,
            field: 'hanji_clj',
        },
        syllableIds: {
            type: dataTypes.STRING(256),
            allowNull: false,
            field: 'syllable_ids',
        },
        natureToneMark: {
            type: dataTypes.TINYINT.UNSIGNED,
            allowNull: true,
            field: 'nature_tone_mark',
        },
        desc: {
            type: dataTypes.TEXT,
            allowNull: true,
        },
    },{
        sequelize,
        tableName: 'words',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true,
        charset: 'utf8mb4'
    });

    Word.belongsToMany(Syllable, {
        through: 'WordSyllables',
        foreignKey: 'wordId',
        otherKey: 'syllableId',
        as: 'syllables',
    });
    Syllable.belongsToMany(Word, {
        through: 'wordSyllables',
        foreignKey: 'syllableId',
        otherKey: 'syllableId',
        as: 'words',
    })

    return Word;
};
