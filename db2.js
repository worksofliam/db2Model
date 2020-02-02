const odbc = require('odbc');

var pool;

module.exports = {
    connect: async (connectionString) => {
        pool = await odbc.pool(connectionString);
    },

    executeStatement: async function (statement, bindings) {
        return await pool.query(statement, bindings);
    },

    callProcedure: async function(schema, name, bindings) {
        const connection = await pool.connect();

        const results = await connection.callProcedure(null, schema, name, bindings);

        await connection.close();

        return results;
    }
}