const util = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const db2 = require('./db2');
const Table = require('./table');

var models = {};

start();

async function start() {
  await db2.connect("Driver=IBM i Access ODBC Driver;System=seiden.iinthecloud.com;UID=ALAN3;Password=wiscon3");
  await getModel(process.argv[2], process.argv[3]);
  await writeModels();
}

async function getModel(schema, table) {

  var currentTable = new Table(schema, table);
  await currentTable.loadColumns();
  await currentTable.loadKeys();
  await currentTable.loadReferences();

  console.log(currentTable);
  models[currentTable.name] = currentTable;

  for (var column of currentTable.columns) {
    if (column.refersTo !== null) {
      if (models[column.refersTo.table] === undefined) {
        await getModel(schema, column.refersTo.table);
      }
    }
  }

  console.log('end');
};

async function writeModels() {
  const fsWrite = util.promisify(fs.writeFile);
  const mkdir = util.promisify(fs.mkdir);

  try {
    await mkdir('tests');
  } catch (e) {}

  for (var model in models) {
    await fsWrite(path.join('tests', models[model].getPrettyName() + '.js'), (await models[model].getClass()).join(os.EOL))
  }
}