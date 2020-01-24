const db2 = require('../db2');
const Projact = require('./Projact');

module.exports = class Empprojact {
  constructor(row) {
    this._table = 'EMPPROJACT';
    this._schema = 'SAMPLE'
    this.empno = row.EMPNO.trim(); 
    this.projno = row.PROJNO.trim(); 
    this.actno = row.ACTNO; 
    this.emptime = row.EMPTIME; 
    this.emstdate = row.EMSTDATE; //Is date
    this.emendate = row.EMENDATE; //Is date
  }

  async getProjact() {
    return await Projact.Get(this.projno);
  }

  async getProjact() {
    return await Projact.Get(this.actno);
  }

  async getProjact() {
    return await Projact.Get(this.emstdate);
  }

  static async Get() {
    const resultSet = await db2.executeStatement(`
      SELECT EMPNO, PROJNO, ACTNO, EMPTIME, EMSTDATE, EMENDATE
      FROM ${this._schema}.${this._table}
      WHERE 
      LIMIT 1
   `, []);

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
      SELECT EMPNO, PROJNO, ACTNO, EMPTIME, EMSTDATE, EMENDATE
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}