const db2 = require('../db2');
const Department = require('./Department');

module.exports = class Employee {
  constructor(row) {
    this._table = 'EMPLOYEE';
    this._schema = 'SAMPLE'
    this.empno = row.EMPNO.trim(); 
    this.firstnme = row.FIRSTNME; 
    this.midinit = row.MIDINIT.trim(); 
    this.lastname = row.LASTNAME; 
    this.workdept = row.WORKDEPT.trim(); 
    this.phoneno = row.PHONENO.trim(); 
    this.hiredate = row.HIREDATE; //Is date
    this.job = row.JOB.trim(); 
    this.edlevel = row.EDLEVEL; 
    this.sex = row.SEX.trim(); 
    this.birthdate = row.BIRTHDATE; //Is date
    this.salary = row.SALARY; 
    this.bonus = row.BONUS; 
    this.comm = row.COMM; 
  }

  async getDepartment() {
    return await Department.Get(this.workdept);
  }

  static async Get(empno) {
    const resultSet = await db2.executeStatement(`
      SELECT EMPNO, FIRSTNME, MIDINIT, LASTNAME, WORKDEPT, PHONENO, HIREDATE, JOB, EDLEVEL, SEX, BIRTHDATE, SALARY, BONUS, COMM
      FROM ${this._schema}.${this._table}
      WHERE empno = ?
      LIMIT 1
   `, [empno]);

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
      SELECT EMPNO, FIRSTNME, MIDINIT, LASTNAME, WORKDEPT, PHONENO, HIREDATE, JOB, EDLEVEL, SEX, BIRTHDATE, SALARY, BONUS, COMM
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}