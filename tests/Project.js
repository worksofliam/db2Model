const db2 = require('../db2');
const Department = require('./Department');
const Employee = require('./Employee');

module.exports = class Project {
  constructor(row) {
    this._table = 'PROJECT';
    this._schema = 'SAMPLE'
    this.projno = row.PROJNO.trim(); 
    this.projname = row.PROJNAME; 
    this.deptno = row.DEPTNO.trim(); 
    this.respemp = row.RESPEMP.trim(); 
    this.prstaff = row.PRSTAFF; 
    this.prstdate = row.PRSTDATE; //Is date
    this.prendate = row.PRENDATE; //Is date
    this.majproj = row.MAJPROJ.trim(); 
  }

  async getDepartment() {
    return await Department.Get(this.deptno);
  }

  async getEmployee() {
    return await Employee.Get(this.respemp);
  }

  async getProject() {
    return await Project.Get(this.majproj);
  }

  static async Get(projno) {
    const resultSet = await db2.executeStatement(`
      SELECT PROJNO, PROJNAME, DEPTNO, RESPEMP, PRSTAFF, PRSTDATE, PRENDATE, MAJPROJ
      FROM ${this._schema}.${this._table}
      WHERE projno = ?
      LIMIT 1
   `, [projno]);

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
      SELECT PROJNO, PROJNAME, DEPTNO, RESPEMP, PRSTAFF, PRSTDATE, PRENDATE, MAJPROJ
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}