import { Model, Optional, DataTypes, Sequelize } from 'sequelize';

type RhymeAttribute = {
    id: number,
    lomaji: string,
    hanji: string | null,
    vowel: string,
    coda: string | null,
    nasal: boolean,
    desc: string | null,
    dataCounts: number,
    createdAt?: Date,
    updatedAt?: Date,
}

type RhymeCreateAttribute = Optional<RhymeAttribute, 'id' | 'coda' | 'desc' | 'createdAt' | 'updatedAt' | 'hanji' >;

export class Rhyme extends Model<RhymeAttribute, RhymeCreateAttribute>{
    declare id : number;
    declare lomaji : string;
    declare hanji : string;
    declare vowel : string;
    declare coda : string;
    declare nasal : boolean;
    declare desc : string;
    declare dataCounts: number;
    declare createdAt : Date;
    declare updatedAt : Date;
}
export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof Rhyme => {
    Rhyme.init({
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
        hanji: {
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
        nasal: {
            type: dataTypes.BOOLEAN,
            allowNull: false,
        },
        desc: {
            type: dataTypes.TEXT,
            allowNull: true,
        },
        dataCounts: {
            type: dataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'data_counts',
        }
    },{
        sequelize,
        tableName: 'rhymes',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true,
        charset: 'utf8mb4'
    });

    return Rhyme;
};
