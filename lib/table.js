const db2 = require('../db2');

module.exports = class Table {
  constructor(schema, name) {
    this.schema = schema.toUpperCase();
    this.name = name.toUpperCase();

    this.columns = [];
    this.includes = [];
  }

  getPrettyName() {
    return prty(this.name);
  }

  async loadColumns() {
    const resultSet = await db2.executeStatement(`
      select column_name, data_type, length, is_nullable, column_heading
      from qsys2.syscolumns2 where table_schema = ? and table_name = ?
    `, [this.schema, this.name]);

    resultSet.forEach(row => this.columns.push(new Column(row)));
  }

  async loadKeys() {
    const resultSet = await db2.executeStatement(`
      WITH xx (CST_NAME, CST_COL_CNT, CST_SCHEMA, CST_TABLE) AS
      (
          SELECT CONSTRAINT_NAME, CONSTRAINT_KEYS, CONSTRAINT_SCHEMA, TABLE_NAME FROM QSYS2.SYSCST A
          WHERE CONSTRAINT_TYPE in ('PRIMARY KEY', 'UNIQUE') AND TABLE_NAME = ? AND CONSTRAINT_SCHEMA = ?
      )
      SELECT CONSTRAINT_SCHEMA, TABLE_NAME, COLUMN_NAME FROM QSYS2.SYSCSTCOL, xx where
      xx.CST_SCHEMA = CONSTRAINT_SCHEMA AND
      xx.CST_TABLE = TABLE_NAME AND
      xx.CST_NAME = CONSTRAINT_NAME
    `, [this.name, this.schema]);

    var column;
    for (var row of resultSet) {
      column = this.columns.find(column => column.columnName === row.COLUMN_NAME).isKey = true;
    }
  }

  async loadReferences() {
    const resultSet = await db2.executeStatement(`
      SELECT --a.CONSTRAINT_SCHEMA, a.TABLE_NAME, c.UNIQUE_CONSTRAINT_NAME, a.CONSTRAINT_NAME, 
          b.COLUMN_NAME, d.TABLE_NAME, d.COLUMN_NAME as REF_COLUMN_NAME
      FROM QSYS2.SYSCST as A 
      inner join QSYS2.SYSCSTCOL as B
          on
              a.CONSTRAINT_NAME = b.CONSTRAINT_NAME and a.CONSTRAINT_SCHEMA = b.CONSTRAINT_SCHEMA
      inner join qsys2.SYSREFCST as C
          on
              C.CONSTRAINT_SCHEMA = a.CONSTRAINT_SCHEMA and C.CONSTRAINT_NAME = a.CONSTRAINT_NAME
      inner join qsys2.SYSCSTCOL as D
          on
              D.CONSTRAINT_SCHEMA = a.CONSTRAINT_SCHEMA and D.CONSTRAINT_NAME = c.UNIQUE_CONSTRAINT_NAME
      WHERE 
          a.CONSTRAINT_TYPE in ('FOREIGN KEY') AND 
          a.TABLE_NAME = ? AND 
          a.CONSTRAINT_SCHEMA = ?
    `, [this.name, this.schema]);

    var column, include;
    for (var row of resultSet) {
      if (!this.includes.find(include => include === row.TABLE_NAME))
        if (row.TABLE_NAME !== this.name)
          this.includes.push(row.TABLE_NAME);

      column = this.columns.find(column => column.columnName === row.COLUMN_NAME);
      if (column) {
        column.refersTo = {
          table: row.TABLE_NAME,
          column: row.REF_COLUMN_NAME
        };
      }
    }
  }

  getClass() {
    var lines = [];
    var tableColumns = [];
    var tableKeys = [];

    this.columns.forEach(column => tableColumns.push(column.columnName));
    const keys = this.columns.filter(column => column.isKey);

    keys.forEach(key => tableKeys.push(key.columnName));

    lines.push(`const db2 = require('../db2');`);
    lines.push(`const GenericTable = require('./GenericTable');`);
    for (var include of this.includes)
      lines.push(`const ${prty(include)} = require('./${prty(include)}');`);

    lines.push(
      ``,
      `module.exports = class ${this.getPrettyName()} extends GenericTable {`,
      `  static _table = '${this.name}';`,
      `  static _schema = '${this.schema}';`,
      `  static _keys = ${JSON.stringify(tableKeys)};`,
      `  static _columns = ${JSON.stringify(tableColumns)};`,
      ``,
      `  constructor(row) {`,
      `    super();`,
      ``,
    )

    var method = '',
      comment = '',
      value = '',
      jsType;
    for (var column of this.columns) {
      comment = '';
      jsType = undefined;
      value = `row.${column.columnName}`;

      if (column.label)
        comment = column.label;
      else
        comment = '';

      switch (column.dataType) {
        case 'INTEGER':
        case 'SMALLINT':
        case 'DECIMAL':
        case 'NUMERIC':
        case 'FLOAT':
        case 'DECFLOAT':
          jsType = 'Number';
          break;

        case 'VARCHAR':
          jsType = 'String';
          break;

        case 'CHAR':
          jsType = 'String';
          if (column.isNullable)
            value = `(${value} ? ${value}.trim() : null)`;
          else
            value += '.trim()';
          break;

        case 'TIME':
          jsType = 'String';
          comment = `Is ${column.dataType.toLowerCase()}`;
          break;

        case 'DATE':
        case 'TIMESTAMP':
          jsType = 'Date';
          if (column.isNullable)
            value = `(${value} ? new Date(${value}) : null)`;
          else
            value = `new Date(${value})`;
          break;

        case 'BIGINT':
          comment = 'Is bigint. Limited support in drivers';
          jsType = 'Number';
          break;
      }

      column.jsType = jsType;

      if (jsType)
        lines.push(`    /** @type {${jsType}} ${comment} */`);
      lines.push(`    this.${column.columnName.toLowerCase()} = ${value};`);
    }

    lines.push(`  }`, '');

    //Get reference fields
    const refs = this.columns.filter(column => column.refersTo !== null);
    for (var ref of refs) {
      lines.push(
        `  /**`,
        `   * Fetchs ${prty(ref.refersTo.table)} by ${ref.columnName.toLowerCase()}`,
        `   * @returns {${prty(ref.refersTo.table)}} Returns new instance of ${prty(ref.refersTo.table)}`,
        `   */`,
        `  async get${prty(ref.refersTo.table)}() {`,
        `    return await ${prty(ref.refersTo.table)}.Get(this.${ref.columnName.toLowerCase()});`,
        '  }',
        ''
      )
    }

    if (keys.length > 0) {
      var keyNames = [];
      keys.forEach(key => keyNames.push(key.columnName.toLowerCase()));
      
      var where = [];
      var bindings = [];
  
      //Create delete method
      for (var column of keys) {
        where.push(`${column.columnName} = ?`);
        bindings.push(`this.${column.columnName.toLowerCase()}`);
      }
      lines.push(        
        `  /**`,
        `   * Delete current ${this.getPrettyName()} row.`,
        '   */',
        '  Delete() {',
        '    return db2.executeStatement(`',
        '      DELETE FROM ${' + this.getPrettyName() + '._schema}.${' + this.getPrettyName() + '._table}',
        `      WHERE ${where.join(' and ')}`,
        `    \`, [${bindings.join(', ')}]);`,
        '  }',
        ''
      )

      //Create update method
      var setColumns = [];
      where = [], bindings = [];
      var nonKeyColumns = this.columns.filter(column => !column.isKey);

      for (var column of nonKeyColumns) {
        setColumns.push(`${column.columnName} = ?`);
        switch (column.dataType) {
          case 'DATE':
            bindings.push(`this.getISODate(this.${column.columnName.toLowerCase()})`);
            break;
          case 'TIMESTAMP':
            bindings.push(`this.getISOTimestamp(this.${column.columnName.toLowerCase()})`);
            break;
          default:
            bindings.push(`this.${column.columnName.toLowerCase()}`);
            break;
        }
      }
      for (var column of keys) {
        where.push(`${column.columnName} = ?`);
        bindings.push(`this.${column.columnName.toLowerCase()}`);
      }
      lines.push(        
        `  /**`,
        `   * Update current ${this.getPrettyName()} row with properties.`,
        '   */',
        '  Update() {',
        '    return db2.executeStatement(`',
        '      UPDATE ${' + this.getPrettyName() + '._schema}.${' + this.getPrettyName() + '._table}',
        `      SET ${setColumns.join(', ')}`,
        `      WHERE ${where.join(' and ')}`,
        `    \`, [${bindings.join(', ')}]);`,
        '  }',
        ''
      )

      lines.push(
        `  /**`,
        `   * Fetchs ${this.getPrettyName()} by keys`,
      )

      var matchingColumn;
      for (var param of keyNames) {
        matchingColumn = this.columns.find(column => column.columnName === param.toUpperCase());

        if (matchingColumn) {
          lines.push(`   * @param {${matchingColumn.jsType}} ${param}`)
        } else {
          lines.push(`   * @param {*} ${param}`)
        }
      }

      lines.push(
        `   * @returns {${this.getPrettyName()}} Returns new instance of ${this.getPrettyName()}`,
        `   */`
      );

      lines.push(
        `  static async Get(${keyNames.join(', ')}) {`,
        `    const row = await this.Find({${keyNames.join(', ')}}, 1);`,
        `    return (row.length === 1 ? row[0] : null);`,
        '  }',
        ''
      )
    }

    lines.push(`}`);

    return lines;
  }
}

class Column {
  constructor(row) {
    this.columnName = row.COLUMN_NAME;
    this.dataType = row.DATA_TYPE.trim();
    this.length = row.LENGTH;
    this.isNullable = (row.IS_NULLABLE === 'Y');
    this.label = row.COLUMN_HEADING;
    this.jsType = undefined;

    this.isKey = false;
    this.refersTo = null;
  }
}

function prty(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}