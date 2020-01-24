
var assert = require('assert');
const db2 = require('./db2');
const ModelGenerator = require('./lib/ModelGenerator');
const Data = require('./lib/Data');

console.log(`Node version is ${process.version}. At least 12.0 is required.`);
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

  //First we need to generate the sample data to play with
  try {
    await db2.executeStatement(`CALL QSYS.CREATE_SQL_SAMPLE ('SAMPLE')`);
  } catch (e) {
    console.log('Sample tables may already exist in SAMPLE schema.');
  }

  //And also generate the models
  await ModelGenerator.getModel("SAMPLE", "PROJACT");
  await ModelGenerator.writeModels();

  const Department = require('./models/Department.js');

  const SupportDept = await Department.Get('E01');
  assert(SupportDept.deptname === "SUPPORT SERVICES");

  const ParentDept = await SupportDept.getDepartment();
  assert(ParentDept.deptno === "A00");

  //getEmployee returns an Employee class
  const SupportManager = await SupportDept.getEmployee();
  assert(SupportManager.firstnme === 'JOHN');

  const Project = require('./models/Project.js');
  const Projact = require('./models/Projact.js');
  const Act = require('./models/Act.js');

  const MyProject = (await Project.Find({PROJNAME: 'PAYROLL PROGRAMMING'}))[0];
  assert(MyProject.projno === 'AD3111');

  const ProjectActivity = await Projact.Find({PROJNO: MyProject.projno});
  assert(ProjectActivity.length === 7);

  const JoinTest = await Data.Join(Projact, Act, {projno: 'AD3111'});
  assert(JoinTest[4].actdesc === "DOCUMENT");

  console.log('Tests pass');
}