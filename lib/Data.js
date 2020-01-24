
const db2 = require('../db2');

module.exports = class Data {
  static async Join(baseTable, joiningTable, columns) {
    var selectColumns = [];

    //First push all the columns that we'll be selecting from the base table
    baseTable._columns.forEach(column => selectColumns.push(`${baseTable._table}.${column}`));

    //Then add all the columns which we need from the joining table
    for (var column of joiningTable._columns) {
      //But only if the base table doesn't have the column
      if (!selectColumns.includes(`${baseTable._table}.${column}`))
        selectColumns.push(`${joiningTable._table}.${column}`)
    }

    var joiningKeys = [];

    for (var column of baseTable._columns) {
      if (joiningTable._keys.includes(column))
        joiningKeys.push(`${baseTable._table}.${column} = ${joiningTable._table}.${column}`);
    }

    var fromClause = `
      FROM ${baseTable._schema}.${baseTable._table} as ${baseTable._table}
      RIGHT JOIN ${joiningTable._schema}.${joiningTable._table} as ${joiningTable._table}
      ON ${joiningKeys.join(' AND ')}
    `;

    var where = [];
    var bindings = [];

    for (var column in columns) {
      where.push(`${column} = ?`);
      bindings.push(columns[column]);
    }

    var statement = `
      SELECT ${selectColumns.join(', ')}
      ${fromClause}
      WHERE ${where.join(' and ')}
    `;

    const resultSet = await db2.executeStatement(statement, bindings);

    if (resultSet.length > 0) {
      var result = [];
      resultSet.forEach(row => result.push({...new baseTable(row), ...new joiningTable(row)}));
      return result;

    } else {
      return null;
    }
  }
}