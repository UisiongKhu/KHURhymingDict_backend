import sequelize, { DataTypes, Model, Sequelize } from "sequelize";

type AnnouncementAttribute = {
    id: number,
    title: string,
    content: string,
    isDeleted: boolean,
    createdAt: Date;
    updatedAt?: Date;
}

export type AnnouncementCreationAttribute = Omit<AnnouncementAttribute, 'id' | 'createdAt' | 'updatedAt'>;

export class Announcement extends Model<AnnouncementAttribute, AnnouncementCreationAttribute> {
    declare id: number;
    declare title: string;
    declare content: string;
    declare isDeleted: boolean;
    declare createdAt: Date;
    declare updatedAt: Date;
};

export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof Announcement => {
    Announcement.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        title: {
            type: dataTypes.STRING,
            allowNull: false,
        },
        content: {
            type: dataTypes.TEXT,
            allowNull: false,
        },
        isDeleted: {
            type: dataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'is_deleted',
        },
        createdAt: {
            type: dataTypes.DATE,
            allowNull: false,
            field: 'created_at',
            defaultValue: dataTypes.NOW,
        },
        updatedAt: {
            type: dataTypes.DATE,
            allowNull: true,
            field: 'updated_at',
        },
    },{
        sequelize,
        indexes: [
            {
                fields: ['is_deleted', 'created_at'],
            }
        ],
        tableName: 'announcements',
        createdAt: true,
        updatedAt: true,
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
    });

    return Announcement;
}