const db2 = require('../db2');
const Employee = require('./Employee');

module.exports = class Department {
  constructor(row) {
    this._table = 'DEPARTMENT';
    this._schema = 'SAMPLE'
    this.deptno = row.DEPTNO.trim(); 
    this.deptname = row.DEPTNAME; 
    this.mgrno = row.MGRNO.trim(); 
    this.admrdept = row.ADMRDEPT.trim(); 
    this.location = row.LOCATION.trim(); 
  }

  async getEmployee() {
    return await Employee.Get(this.mgrno);
  }

  async getDepartment() {
    return await Department.Get(this.admrdept);
  }

  static async Get(deptno) {
    const resultSet = await db2.executeStatement(`
      SELECT DEPTNO, DEPTNAME, MGRNO, ADMRDEPT, LOCATION
      FROM ${this._schema}.${this._table}
      WHERE deptno = ?
      LIMIT 1
   `, [deptno]);

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
      SELECT DEPTNO, DEPTNAME, MGRNO, ADMRDEPT, LOCATION
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}