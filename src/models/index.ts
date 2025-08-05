import config from '../config/config';
import { Sequelize, DataTypes } from 'sequelize';

import rhymeInit, {Rhyme} from './rhyme';
import syllableInit, { Syllable } from './syllable';
import wordInit, { Word } from './word';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(config.development.database!, config.development.username!, config.development.password, {
  host: 'localhost',
  port: 8763,
  dialect: 'mysql',
  logging: true,
});

export interface Db {
    sequelize : Sequelize;
    Sequelize : typeof Sequelize;
    Rhyme : typeof Rhyme;
    Syllable : typeof Syllable;
    Word: typeof Word;
}

const db : Db = {
    sequelize,
    Sequelize,
    Rhyme: rhymeInit(sequelize, DataTypes),
    Syllable: syllableInit(sequelize, DataTypes),
    Word: wordInit(sequelize, DataTypes),
}

export default db;