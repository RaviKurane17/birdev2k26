const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// TiDB Cloud and other cloud MySQL services require SSL
if (process.env.DB_SSL === 'true') {
    dbConfig.ssl = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    };
}

// Support DATABASE_URL format (used by many cloud providers)
if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig.host = url.hostname;
    dbConfig.port = url.port || 3306;
    dbConfig.user = url.username;
    dbConfig.password = url.password;
    dbConfig.database = url.pathname.slice(1);
    if (url.searchParams.get('ssl') === 'true' || url.protocol === 'mysqls:') {
        dbConfig.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    }
}

const pool = mysql.createPool(dbConfig);

// For promises
const promisePool = pool.promise();

module.exports = promisePool;
