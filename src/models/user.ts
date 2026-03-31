import sequelize, { DataTypes, Model, Sequelize } from "sequelize";
import * as bcrypt from 'bcrypt';
type UserAttribute = {
    id: number,
    type: number, // 0: normal user, 1: administrator
    status: number, // 0: normal, 1: muted, 2: banned, 3: deleted
    email: string,
    password: string,
    profilePic: string | null,
    nickname: string,
    desc: string | null,
    createdAt?: Date,
    updatedAt?: Date,
    mutedTo?: Date | null,
    lastLoginAt?: Date | null,
}

export type UserCreationAttribute = Omit<UserAttribute, 'id' | 'type' | 'profilePic' | 'desc' | 'mutedTo' | 'lastLoginAt' | 'createdAt' | 'updatedAt'>;

export class User extends Model<UserAttribute, UserCreationAttribute> {
    declare id: number;
    declare type: number;
    declare status: number;
    declare email: string;
    declare password: string;
    declare profilePic: string | null;
    declare nickname: string;
    declare desc: string | null;
    declare createdAt?: Date;
    declare updatedAt?: Date;
    declare mutedTo?: Date | null;
    declare lastLoginAt?: Date | null;
};

export default (sequelize: Sequelize, dataTypes: typeof DataTypes): typeof User => {
    User.init({
        id: {
            type: dataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true,
        },
        type: {
            type: dataTypes.TINYINT.UNSIGNED,
            defaultValue: 0,
            allowNull: false,
        },
        status: {
            type: dataTypes.TINYINT.UNSIGNED,
            defaultValue: 0,
            allowNull: false,
        },
        email: {
            type: dataTypes.STRING(256),
            allowNull: false,
            unique: true,
        },
        password: {
            type: dataTypes.STRING(256),
            allowNull: false,
        },
        profilePic: {
            type: dataTypes.STRING(512),
            allowNull: true,
            field: 'profile_pic',
        },
        nickname: {
            type: dataTypes.STRING(256),
            allowNull: false,
        },
        desc: {
            type: dataTypes.STRING(1024),
            allowNull: true,
        },
        mutedTo: {
            type: dataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            field: 'muted_to',
        },
        lastLoginAt: {
            type: dataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            field: 'last_login_at',
        }
    },{
        sequelize,
        indexes: [
            {
                fields: ['email', 'last_login_at'],
            }
        ],
        hooks: {
            beforeCreate: async (user) => {
                if(user.password){
                    // Hash the password before saving to the database
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);

                }
            },
            beforeUpdate: async (user) => {
                if(user.changed('password')){
                    // Hash the password before saving to the database
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        },
        tableName: 'users',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
    });

    return User;
}