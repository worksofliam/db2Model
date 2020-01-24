const db2 = require('../db2');
const Employee = require('./Employee');

module.exports = class Emp_photo {
  constructor(row) {
    this._table = 'EMP_PHOTO';
    this._schema = 'SAMPLE'
    this.empno = row.EMPNO.trim(); 
    this.photo_format = row.PHOTO_FORMAT; 
    this.picture = row.PICTURE; 
    this.emp_rowid = row.EMP_ROWID.trim(); 
    this.dl_picture = row.DL_PICTURE; 
  }

  async getEmployee() {
    return await Employee.Get(this.empno);
  }

  static async Get(empno, photo_format) {
    const resultSet = await db2.executeStatement(`
      SELECT EMPNO, PHOTO_FORMAT, PICTURE, EMP_ROWID, DL_PICTURE
      FROM ${this._schema}.${this._table}
      WHERE empno = ? and photo_format = ?
      LIMIT 1
   `, [empno, photo_format]);

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
      SELECT EMPNO, PHOTO_FORMAT, PICTURE, EMP_ROWID, DL_PICTURE
      FROM ${this._schema}.${this._table}
      WHERE ${where.join(" and ")}
    `, bindings)

    var result = [];
    resultSet.forEach(row => result.push(new this(row)));

    return result;
  }

}