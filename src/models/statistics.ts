import sequelize, { DataTypes, Model, Sequelize } from "sequelize";

type StatisticsAttribute = {
    id: number,
    key: string,
    value: number,
    createdAt?: Date,
    updatedAt?: Date,
}

type StatisticsCreationAttribute = Omit<StatisticsAttribute, 'id'>;

export class Statistics extends Model<StatisticsAttribute, StatisticsCreationAttribute> {
    declare id: number;
    declare key: string;
    declare value: number;
};

export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof Statistics => {
    Statistics.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        key: {
            type: dataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        value: {
            type: dataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        createdAt: {
            type: dataTypes.DATE,
            field: 'created_at',
        },
        updatedAt: {
            type: dataTypes.DATE,
            field: 'updated_at',
        },
    },{
        sequelize,
        tableName: 'statistics',
        createdAt: true,
        updatedAt: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
    });

    return Statistics;
}