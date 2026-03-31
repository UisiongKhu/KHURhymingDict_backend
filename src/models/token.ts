import sequelize, { DataTypes, Model, Sequelize } from "sequelize";
import * as bcrypt from 'bcrypt';
type TokenAttribute = {
    id: number,
    userId: number,
    token: string,
    expiresAt: Date,
    createdAt?: Date,
    updatedAt?: Date,
}

type TokenCreationAttribute = Omit<TokenAttribute, 'id' | 'createdAt' | 'updatedAt'>;

export class Token extends Model<TokenAttribute, TokenCreationAttribute> {
    declare id: number;
    declare userId: number;
    declare token: string;
    declare expiresAt: Date;
    declare createdAt?: Date;
    declare updatedAt?: Date;
};

export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof Token => {
    Token.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: dataTypes.INTEGER.UNSIGNED,
            field: 'user_id',
            allowNull: false,
        },
        token: {
            type: dataTypes.STRING(255),
            allowNull: false,
        },
        expiresAt: {
            type: dataTypes.DATE,
            field: 'expires_at',
            allowNull: false,
        }
    },{
        sequelize,
        tableName: 'refresh_tokens',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true,
        indexes: [
            {
                name: 'idx_user_id',
                fields: ['user_id'],
            },
            {
                name: 'idx_token',
                fields: ['token'],
            }
        ]
    });

    return Token;
}