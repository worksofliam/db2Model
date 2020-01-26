
const db2 = require('./db2');
const ModelGenerator = require('./lib/ModelGenerator');

console.log(`The following environment variabes are needed to connect: ISYS, IUSER, IPASS`);

switch (undefined) {
  case process.env['ISYS']: case process.env['IUSER']: case process.env['IPASS']:
    console.log('Please update your environment variables first.');
    return;
}

work();
async function work() {
  var mode = '';

  console.log('');
  switch (process.argv[2]) {
    case 'models':
    case 'procs':

      mode = process.argv[2];
      break;
    default:
      console.log('Please provide the correct mode. Either "models" or "procs".');
      console.log('');
      console.log('Models: Generates models for the specific table and any of it\'s foreign keys.');
      console.log('\tindex.js models SAMPLE DEPARTMENT');
      console.log('');
      console.log('Procedures: Generates a class of methods for calling stored procedures in specified schema.');
      console.log('\tindex.js procs QSYS');
      console.log('');
      return;
  }

  console.log(`Connecting to ${process.env['ISYS']} with ${process.env['IUSER']}.`);
  console.log('')
  await db2.connect(`Driver=IBM i Access ODBC Driver;System=${process.env['ISYS']};UID=${process.env['IUSER']};Password=${process.env['IPASS']}`);

  switch (mode) {
    case 'models':
      await ModelGenerator.getModel(process.argv[3], process.argv[4]);
      await ModelGenerator.writeModels();
      break;

    case 'procs':
      await ModelGenerator.getMethods(process.argv[3]);
      await ModelGenerator.writeModels();
      break;
  }
}