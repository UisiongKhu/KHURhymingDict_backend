// src/migrations/YYYYMMDDHHMMSS-create-rhymes.ts
// (請將 YYYYMMDDHHMMSS 替換為實際的時間戳，例如 20250713183000)

import { QueryInterface, DataTypes, QueryOptions } from 'sequelize'; // 引入必要的 Sequelize 類型
import { literal } from 'sequelize';
module.exports = {
  /**
   * `up` 方法用於定義如何執行遷移（創建表、添加欄位等）。
   */
  async up(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    await queryInterface.createTable('rhymes', { // 將表名改為小寫 `rhymes` 以匹配資料庫
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED, // `int unsigned`
        comment: '. 0, 1, 2' // 添加註釋
      },
      lomaji: {
        type: Sequelize.STRING(32), // `varchar(32)`，指定長度
        allowNull: false, // `NOT NULL`
        comment: ' (). chih, p, be'
      },
      hanji: {
        type: Sequelize.STRING(1), // `char(1)`，指定長度
        allowNull: false, // `NOT NULL`
        comment: '. , , '
      },
      vowel: {
        type: Sequelize.STRING(3), // `varchar(3)`，指定長度
        allowNull: false, // `NOT NULL`
        comment: '. ia, a, oe'
      },
      coda: {
        type: Sequelize.STRING(1), // `char(1)`，指定長度
        allowNull: false, // `NOT NULL`
        comment: '. h, (), ()'
      },
      nasal: {
        type: Sequelize.BOOLEAN, // `tinyint(1)` 通常映射為 `BOOLEAN`
        allowNull: false, // `NOT NULL`
        comment: '. 0, 0, 0'
      },
      desc: {
        type: Sequelize.STRING(1024), // `varchar(1024)`，指定長度
        allowNull: true, // `DEFAULT NULL`
      },
      created_at: { // 資料庫欄位名稱為 `created_at`
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP'), // 匹配 `DEFAULT CURRENT_TIMESTAMP`
      },
      updated_at: { // 資料庫欄位名稱為 `updated_at`
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), // 匹配 `DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
      }
    }, {
      // 在這裡可以添加表的選項，例如 comment
      comment: ' rhymes', // 表級別的 COMMENT
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      engine: 'InnoDB'
    } as QueryOptions); // 將類型斷言為 QueryOptions，以包含表選項
  },

  /**
   * `down` 方法用於定義如何回滾遷移（刪除表、刪除欄位等）。
   */
  async down(queryInterface: QueryInterface, Sequelize: typeof DataTypes) {
    await queryInterface.dropTable('rhymes'); // 將表名改為小寫 `rhymes`
  }
};