import sequelize, { DataTypes, Model, Sequelize } from "sequelize";

type VisitorLogAttribute = {
    id: number,
    ip: string,
    visitTime: Date,
}

type VisitorLogCreationAttribute = Omit<VisitorLogAttribute, 'id' | 'visitTime'>;

export class VisitorLog extends Model<VisitorLogAttribute, VisitorLogCreationAttribute> {
    declare id: number;
    declare ip: string;
    declare visitTime: Date;
};

export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof VisitorLog => {
    VisitorLog.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
        },
        ip: {
            type: dataTypes.STRING(45),
            allowNull: false,
        },
        visitTime: {
            type: dataTypes.DATE,
            allowNull: false,
            defaultValue: dataTypes.NOW,
            field: 'visit_time',
        }
    },{
        sequelize,
        indexes: [
            {
                fields: ['ip', 'visit_time'],
            }
        ],
        tableName: 'visitor_logs',
        createdAt: false,
        updatedAt: false,
        timestamps: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
    });

    return VisitorLog;
}