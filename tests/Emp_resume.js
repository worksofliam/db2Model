const db2 = require('../db2');
const Employee = require('./Employee');

module.exports = class Emp_resume {
  constructor(row) {
    this._table = 'EMP_RESUME';
    this._schema = 'SAMPLE'
    this.empno = row.EMPNO.trim(); 
    this.resume_format = row.RESUME_FORMAT; 
    this.resume = row.RESUME; 
    this.emp_rowid = row.EMP_ROWID.trim(); 
    this.dl_resume = row.DL_RESUME; 
  }

  async getEmployee() {
    return await Employee.Get(this.empno);
  }

  static async Get(empno, resume_format) {
    const resultSet = await db2.executeStatement(`
      SELECT EMPNO, RESUME_FORMAT, RESUME, EMP_ROWID, DL_RESUME
      FROM ${this._schema}.${this._table}
      WHERE empno = ? and resume_format = ?
      LIMIT 1
   `, [empno, resume_format]);

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
      SELECT EMPNO, RESUME_FORMAT, RESUME, EMP_ROWID, DL_RESUME
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}