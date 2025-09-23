import { Model, Optional, DataTypes, Sequelize } from 'sequelize';
import { Syllable } from './syllable';
import { Word } from './word';

type WordSyllablesAssociation = {
    syllable?: Syllable;
    word?: Word;
}

export type WordSyllablesAttribute = {
    id: number,
    wordId: number,
    syllableId: number,
    order: number,
} & WordSyllablesAssociation;

// Tēng gī bô it tēng ài siat ê chu liāu hāng.
type WordSyllablesCreateAttribute = Optional<WordSyllablesAttribute, 'id'>;

// Tēng gī model ê attribute
export class WordSyllables extends Model<WordSyllablesAttribute, WordSyllablesCreateAttribute>{
    declare id : number;
    declare wordId : number;
    declare syllableId : number;
    declare order : number;
}

// Model Initialization
export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof WordSyllables => {
    WordSyllables.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        wordId: {
            type: dataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'word_id',
            references: { model: 'words', key: 'id' },
        },
        syllableId: {
            type: dataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'syllable_id',
            references: { model: 'syllables', key: 'id' },
        },
        order: {
            type: dataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
    },{
        sequelize,
        tableName: 'WordSyllables',
        freezeTableName: true,
        modelName: 'WordSyllables',
        timestamps: false,
        indexes: [
            {
                unique: true,
                fields: ['word_id', 'order'],
                name: 'uq_word_order',
            }
        ],
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
    });

    return WordSyllables;
};
