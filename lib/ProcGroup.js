const db2 = require('../db2');

module.exports = class ProcGroup {
  constructor(schema) {
    this.schema = schema.toUpperCase();

    this.procedures = [];
  }

  async GetProcedures() {
    const results = await db2.executeStatement(`
      select specific_schema, specific_name, routine_schema, routine_name, routine_created, external_name, external_language, routine_text
      from qsys2.sysprocs where routine_schema = ?
    `, [this.schema]);

    this.procedures = results.map(row => new Procedure(row));

    for (var procedure of this.procedures) {
      console.log(`Fetching columns for ${procedure.schema}/${procedure.name}.`);
      await procedure.getParameters();
    }
  }

  getPrettyName() {
    return this.schema.toUpperCase();
  }

  getClass() {
    var lines = [];

    lines.push( 
      `const db2 = require('../db2');`,
      '',
      `module.exports = class ${this.getPrettyName()} {`
    );

    var functionParams = [], procParams = [], bindingParams = [], jsType = '*', comment = undefined;
    for (var procedure of this.procedures) {
      functionParams = [], procParams = [], bindingParams = [], jsType = '*', comment = undefined;

      lines.push(`  /**`);
      if (procedure.description)
        lines.push(`  * ${procedure.description}`);

      procedure.parameters.forEach(function (param) {
        switch (param.pass_type) {
          case 'IN':
          case 'INOUT':
            procParams.push('?');
            bindingParams.push(param.getPrettyName());
            break;
          case 'OUT':
            procParams.push('?');
            bindingParams.push("null");
            break;
        }

        switch (param.dataType) {
          case 'INTEGER':
          case 'SMALLINT':
          case 'DECIMAL':
          case 'NUMERIC':
          case 'FLOAT':
          case 'DECFLOAT':
          case 'DOUBLE PRECISION':
            jsType = 'Number';
            break;
  
          case 'BIGINT':
            comment = 'is bigint. Limited support in drivers';
            jsType = 'Number';
            break;
  
          case 'CHAR':
          case 'CHARACTER':
          case 'CHARACTER VARYING':
            jsType = 'String';
            break;
  
          case 'DATE':
          case 'TIMESTAMP':
          case 'TIME':
            jsType = 'String';
            comment = `is ${param.dataType.toLowerCase()}`;
            break;

          default:
            console.log(`Undocument parameter type: ${param.dataType}`);
            comment = `${param.dataType}`
            break;
        }

        if (param.pass_type.includes('IN', 'INOUT')) {
          functionParams.push(`${param.getPrettyName()}${param.defaultValue ? ' = ' + param.defaultValue : ''}` );
          lines.push(`   * @param {${jsType}} ${param.getPrettyName()} ${param.description} ${comment ? '(' + comment + ')' : ''}`);
        }
      });

      lines.push('   */');

      lines.push(`  static async ${procedure.getPrettyName()}(${functionParams.join(', ')}) {`);

      procedure.parameters.forEach(function (parameter) {
        if (parameter.maxLength) {
          lines.push(`    if (${parameter.getPrettyName()}.length > ${parameter.maxLength}) throw new Error('${parameter.getPrettyName()} over max length.');`);
        }
      });

      lines.push(
        '',
        '    const results = await db2.executeStatement(`',
        `      CALL ${procedure.schema}.${procedure.name}(${procParams.join(', ')})`,
        `    \`, [${bindingParams.join(', ')}]);`,
        '',
        '    return results;',
        `  }`,
        ''
      );
    }

    lines.push('}');

    return lines;
  }

}

class Procedure {
  constructor(row) {
    this.specific_schema = row.SPECIFIC_SCHEMA;
    this.specific_name = row.SPECIFIC_NAME;
    this.name = row.ROUTINE_NAME;
    this.schema = row.ROUTINE_SCHEMA;
    this.created = row.ROUTINE_CREATED;
    this.calls = row.EXTERNAL_NAME;
    this.external_language = row.EXTERNAL_LANGUAGE;
    this.description = row.ROUTINE_TEXT;

    this.parameters = [];
  }

  async getParameters() {
    const results = await db2.executeStatement(`
      select parameter_mode, parameter_name, data_type, character_maximum_length, default, long_comment
      from qsys2.SYSPARMS 
      where SPECIFIC_SCHEMA = ? and specific_name = ?
      order by ordinal_position
    `, [this.specific_schema, this.specific_name]);

    this.parameters = results.map(row => new Parameter(row));
  }

  getPrettyName() {
    return this.name.toLowerCase();
  }
}

class Parameter {
  constructor(row) {
    this.pass_type = row.PARAMETER_MODE;
    this.name = row.PARAMETER_NAME;
    this.dataType = row.DATA_TYPE;
    this.maxLength = row.CHARACTER_MAXIMUM_LENGTH;
    this.defaultValue = row.DEFAULT;
    this.description = row.LONG_COMMENT || '';
  }

  getPrettyName() {
    return this.name.toLowerCase();
  }
}