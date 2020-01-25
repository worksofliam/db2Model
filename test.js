
var assert = require('assert');
const db2 = require('./db2');
const ModelGenerator = require('./lib/ModelGenerator');

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

  //Find a project by name
  /** @type {Project} */
  const MyProject = (await Project.Find({PROJNAME: 'PAYROLL PROGRAMMING'}))[0];
  assert(MyProject.projno === 'AD3111');

  //Find a list of activities
  const ProjectActivity = await Projact.Find({PROJNO: MyProject.projno});
  assert(ProjectActivity.length === 7);

  //Get a list of activities, but also join to the Act table
  //so you can also get the activity descrption
  const JoinTest = await Projact.Join(Act, {projno: MyProject.projno});
  assert(JoinTest[4].actdesc === "DOCUMENT");

  var UpdateTest;

  UpdateTest = await Department.Get('E01');
  assert(UpdateTest.deptname === "SUPPORT SERVICES");

  UpdateTest.deptname = 'Field change test';
  await UpdateTest.Update();

  UpdateTest = await Department.Get('E01');
  assert(UpdateTest.deptname === "Field change test");

  UpdateTest.deptname = 'SUPPORT SERVICES';
  await UpdateTest.Update();

  console.log('Tests pass');
}