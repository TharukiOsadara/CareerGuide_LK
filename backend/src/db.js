// Keep the parent module's existing import path while sharing the main pool.
module.exports = require('./config/db').pool;