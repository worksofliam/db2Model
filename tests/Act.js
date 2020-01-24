const db2 = require('../db2');

module.exports = class Act {
  constructor(row) {
    this._table = 'ACT';
    this._schema = 'SAMPLE'
    this.actno = row.ACTNO; 
    this.actkwd = row.ACTKWD.trim(); 
    this.actdesc = row.ACTDESC; 
  }

  static async Get(actno) {
    const resultSet = await db2.executeStatement(`
      SELECT ACTNO, ACTKWD, ACTDESC
      FROM ${this._schema}.${this._table}
      WHERE actno = ?
      LIMIT 1
   `, [actno]);

    return new this(resultSet[0]);
  }

  static async Find(where) {
    var where = [];
    var bindings = [];

    for (var column in where) {
      where.push(`${column} = ?`);
      bindings.push(where[column]);
    }

    const resultSet = await db2.executeStatement(`
      SELECT ACTNO, ACTKWD, ACTDESC
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}