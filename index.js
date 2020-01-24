
const db2 = require('./db2');
const ModelGenerator = require('./lib/ModelGenerator');

start();

async function start() {
  console.log(`The following environment variabes are needed to connect: ISYS, IUSER, IPASS`);
  console.log(`Connecting to ${process.env['ISYS']} with ${process.env['IUSER']}.`);
  console.log('')
  await db2.connect(`Driver=IBM i Access ODBC Driver;System=${process.env['ISYS']};UID=${process.env['IUSER']};Password=${process.env['IPASS']}`);
  await ModelGenerator.getModel(process.argv[2], process.argv[3]);
  await ModelGenerator.writeModels();
}