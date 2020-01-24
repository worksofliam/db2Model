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
      select column_name, data_type, length, is_nullable
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

  async getClass() {
    var lines = [];
    var tableColumns = [];

    this.columns.forEach(column => tableColumns.push(column.columnName));

    lines.push(`const db2 = require('../db2');`);
    for (var include of this.includes)
      lines.push(`const ${prty(include)} = require('./${prty(include)}');`);

    lines.push(
      ``,
      `module.exports = class ${prty(this.name)} {`,
      `  constructor(row) {`,
      `    this._table = '${this.name}';`,
      `    this._schema = '${this.schema}'`
    )

    var method = '', comment = '', value = '';
    for (var column of this.columns) {
      comment = '';
      value = `row.${column.columnName}`;

      switch (column.dataType) {
        case 'CHAR':
          if (column.isNullable)
            value = `(${value} ? ${value}.trim() : null)`;
          else 
            value += '.trim()';
          break;
        case 'TIME':
          comment = `//Is ${column.dataType.toLowerCase()}`;
          break;

        case 'DATE':
        case 'TIMESTAMP':
          if (column.isNullable)
            value = `(${value} ? new Date(${value}) : null)`;
          else 
            value = `new Date(${value})`;
          break;

        case 'BIGINT':
          comment = '//Is bigint. Limited support in drivers';
          break;
      }

      lines.push(`    this.${column.columnName.toLowerCase()} = ${value}; ${comment}`);
    }

    lines.push(`  }`, '');

    //Get reference fields
    const refs = this.columns.filter(column => column.refersTo !== null);
    for (var ref of refs) {
      lines.push(
        `  async get${prty(ref.refersTo.table)}() {`,
        `    return await ${prty(ref.refersTo.table)}.Get(this.${ref.columnName.toLowerCase()});`,
        '  }',
        ''
      )
    }

    //Get by key
    const keys = this.columns.filter(column => column.isKey);
    var keyNames = []; keys.forEach(key => keyNames.push(key.columnName.toLowerCase()));
    var clauses = []; keyNames.forEach(column => clauses.push(column + ' = ?'));
    lines.push(
      `  static async Get(${keyNames.join(', ')}) {`,
      '    const resultSet = await db2.executeStatement(`',
      `      SELECT ${tableColumns.join(', ')}`,
      `      FROM ${this.schema}.${this.name}`,
      `      WHERE ${clauses.join(' and ')}`,
      `      LIMIT 1`,
      `   \`, [${keyNames.join(', ')}]);`,
      '',
      '    return new this(resultSet[0]);',
      '  }',
      ''
    )
    
    //Generic where finder
    lines.push(
      '  static async Find(where) {',
      '    var where = [];',
      '    var bindings = [];',
      '',
      '    for (var column in where) {',
      '      where.push(`${column} = ?`);',
      '      bindings.push(where[column]);',
      '    }',
      '',
      '    const resultSet = await db2.executeStatement(`',
      `      SELECT ${tableColumns.join(', ')}`,
      `      FROM ${this.schema}.${this.name}`,
      '      WHERE ${where.join(" and ")}',
      '    `, bindings)',
      '',
      '    var result = [];',
      '    resultSet.forEach(row => result.push(new this(row)));',
      '',
      '    return result;',
      '  }',
      ''
    )

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

    this.isKey = false;
    this.refersTo = null;
  }
}

function prty(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}