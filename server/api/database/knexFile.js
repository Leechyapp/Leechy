const dotenv = require('dotenv');
dotenv.config({ path: '../../../.env' });

const DB_CONNECT_OBJ = {
  client: 'mysql',
  connection: {
    charset: 'utf8',
    timezone: 'UTC',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  pool: {
    min: 0,
    max: 50,
    propagateCreateError: true, // <- default is true, set to false
  },
  migrations: {
    directory: __dirname + '/migrations',
  },
  seeds: {
    directory: __dirname + '/seeds',
    // stub: 'src/databases/stubs',
  },
};

module.exports = DB_CONNECT_OBJ;
