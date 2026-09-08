const { Sequelize } = require('sequelize');

const databaseUrl = process.env.DATABASE_URL || '';
const useSsl = /sslmode=require/i.test(databaseUrl) || process.env.DB_SSL === 'true';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : undefined,
  define: {
    underscored: false,
    freezeTableName: false
  }
});

module.exports = sequelize;
