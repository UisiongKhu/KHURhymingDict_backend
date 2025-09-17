import config from '../config/config';
import { Sequelize, DataTypes } from 'sequelize';

import rhymeInit, {Rhyme} from './rhyme';
import syllableInit, { Syllable } from './syllable';
import wordInit, { Word } from './word';
import wordSyllablesInit, { WordSyllables } from './wordSyllables';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(config.development.database!, config.development.username!, config.development.password, {
  host: 'localhost',
  port: 8763,
  dialect: 'mysql',
  logging: config.development.logging,
  pool: config.development.pool,
});

export interface Db {
    sequelize : Sequelize;
    Sequelize : typeof Sequelize;
    Rhyme : typeof Rhyme;
    Syllable : typeof Syllable;
    Word: typeof Word;
    WordSyllables: typeof WordSyllables;
}

const db : Db = {
    sequelize,
    Sequelize,
    Rhyme: rhymeInit(sequelize, DataTypes),
    Syllable: syllableInit(sequelize, DataTypes),
    Word: wordInit(sequelize, DataTypes),
    WordSyllables: wordSyllablesInit(sequelize, DataTypes),
}

db.Word.belongsToMany(db.Syllable, { through: {
    model: db.WordSyllables,
    unique: false,
  }, foreignKey: 'word_id', constraints: false });

db.Syllable.belongsToMany(db.Word, { through: {
    model: db.WordSyllables,
    unique: false,
  }, foreignKey: 'syllable_id', constraints: false });

export default db;