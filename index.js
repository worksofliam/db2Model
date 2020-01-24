
const db2 = require('./db2');
const ModelGenerator = require('./lib/ModelGenerator');

console.log(`The following environment variabes are needed to connect: ISYS, IUSER, IPASS`);

switch (undefined) {
  case process.env['ISYS']: case process.env['IUSER']: case process.env['IPASS']:
    console.log('Please update your environment variables first.');
    return;
}

start();

async function start() {
  console.log(`Connecting to ${process.env['ISYS']} with ${process.env['IUSER']}.`);
  console.log('')
  await db2.connect(`Driver=IBM i Access ODBC Driver;System=${process.env['ISYS']};UID=${process.env['IUSER']};Password=${process.env['IPASS']}`);
  await ModelGenerator.getModel(process.argv[2], process.argv[3]);
  await ModelGenerator.writeModels();
}