const db2 = require('../db2');
const Project = require('./Project');
const Act = require('./Act');

module.exports = class Projact {
  constructor(row) {
    this._table = 'PROJACT';
    this._schema = 'SAMPLE'
    this.projno = row.PROJNO.trim(); 
    this.actno = row.ACTNO; 
    this.acstaff = row.ACSTAFF; 
    this.acstdate = row.ACSTDATE; //Is date
    this.acendate = row.ACENDATE; //Is date
  }

  async getProject() {
    return await Project.Get(this.projno);
  }

  async getAct() {
    return await Act.Get(this.actno);
  }

  static async Get(projno, actno, acstdate) {
    const resultSet = await db2.executeStatement(`
      SELECT PROJNO, ACTNO, ACSTAFF, ACSTDATE, ACENDATE
      FROM ${this._schema}.${this._table}
      WHERE projno = ? and actno = ? and acstdate = ?
      LIMIT 1
   `, [projno, actno, acstdate]);

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
      SELECT PROJNO, ACTNO, ACSTAFF, ACSTDATE, ACENDATE
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}