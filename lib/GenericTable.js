const db2 = require('../db2');

module.exports = class GenericTable {
  constructor() {}

  /**
   * Fetchs an array of this by clauses provided.
   * @param {Object} columns An object where each property is a clause in the WHERE statement.
   * @param {Number} [limit] The amount of rows to return - optional.
   * @returns {this[]} Returns an array of this.
   */
  static async Find(columns = {}, limit) {
    var where = [];
    var bindings = [];
    var limitClause = ``

    for (var column in columns) {
      where.push(`${column} = ?`);
      bindings.push(columns[column]);
    }

    if (limit) {
      limitClause = `LIMIT ?`;
      bindings.push(limit);
    }

    if (where.length > 0) {
      where = `WHERE ${where.join(" and ")}`;
    }

    const resultSet = await db2.executeStatement(`
      SELECT ${this._columns.join(', ')}
      FROM ${this._schema}.${this._table}
      ${where}
      ${limitClause}
    `, bindings);


    if (resultSet.length > 0) {
      var result = [];
      resultSet.forEach(row => result.push(new this(row)));
      return result;

    } else {
      return [];
    }
  }

  static UpdateWhere(keys, newColumns) {
    var bindings = [], setClause = [], whereClause = [];

    for (var column in newColumns) {
      setClause.push(`${column} = ?`);
      bindings.push(newColumns[column]);
    }

    for (var key in keys) {
      whereClause.push(`${key} = ?`);
      bindings.push(keys[key])
    }

    var updateQuery = `
      UPDATE ${this._schema}.${this._table}
      SET ${setClause.join(', ')}
      WHERE ${whereClause.join(' AND ')}
    `;

    return db2.executeStatement(updateQuery, bindings);
  }

  static async Join(joiningTable, columns) {
    var selectColumns = [];

    //First push all the columns that we'll be selecting from the base table
    this._columns.forEach(column => selectColumns.push(`${this._table}.${column}`));

    //Then add all the columns which we need from the joining table
    for (var column of joiningTable._columns) {
      //But only if the base table doesn't have the column
      if (!selectColumns.includes(`${this._table}.${column}`))
        selectColumns.push(`${joiningTable._table}.${column}`)
    }

    var joiningKeys = [];

    for (var column of this._columns) {
      if (joiningTable._keys.includes(column))
        joiningKeys.push(`${this._table}.${column} = ${joiningTable._table}.${column}`);
    }

    var fromClause = `
      FROM ${this._schema}.${this._table} as ${this._table}
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
      resultSet.forEach(row => result.push({
        ...new this(row),
        ...new joiningTable(row)
      }));
      return result;

    } else {
      return [];
    }
  }

  /**
   * @param {Date} date 
   */
  static getISODate(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + date.getDay();
  }

  /**
   * @param {Date} date 
   */
  static getISOTimestamp(date) {
    //'2018-07-25-14.56.11.000000'
    return this.getISODate(date) + '-' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds() + '.000000';
  }
}