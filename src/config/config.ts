import dotenv from 'dotenv';
import { Options } from 'sequelize';

dotenv.config(); // 載入 .env 檔案中的環境變數

interface DbConfig {
  development: Options;
  test: Options;
  production: Options;
}

const config: DbConfig = {
  development: {
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'KHURhymingDict',
    host: process.env.DB_HOST || '8763',
    dialect: 'mysql',
    logging: true, // 設置為 true 可以看到 SQL 查詢日誌
  },
  test: {
    // 測試環境設定
  },
  production: {
    // 生產環境設定
  },
};

export default config;