const knex = require('knex');
const knexFile = require('./knexFile');

const knexDB = knex(knexFile);

module.exports = knexDB;
