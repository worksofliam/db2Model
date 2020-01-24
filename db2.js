const odbc = require('odbc');

var pool;

module.exports = {
    connect: async (connectionString) => {
        pool = await odbc.pool(connectionString);
    },

    executeStatement: async function (statement, bindings) {
        return await pool.query(statement, bindings);
    }
}