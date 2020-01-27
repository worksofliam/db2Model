# db2Model

db2Model is a model generator for Db2 for i tables. It's a simple command line tool that generates JavaScript classes which can be used as a simple ORM.

db2Model can create:

* a class for the table specified
* static methods to fetch a row based on the primary or unique keys
* instance methods to fetch models based on foreign references keys
* instance methods to update and delete based on primary or unique keys
* classes for tables referenced in foreign keys.
* documentation for each class, instance method and static method.
* a class with methods to call stored procedures for a chosen schema

db2Model is using the odbc driver to connect, which must be installed onto the system running this script.

## Usage

### Creating Models

```
$ node index models SAMPLE DEPARTMENT

The following environment variabes are needed to connect: ISYS, IUSER, IPASS
Connecting to xxx with xxx.

Defined table DEPARTMENT
Defined table EMPLOYEE
Written to "models/Department.js".
Written to "models/Employee.js".
```

The reason `Employee.js` is created here is because the `DEPARTMENT` table has the column `mgrno` which references to the `EMPLOYEE` table. It also creates `getEmployee` inside of the `Employee` class as you can see below.

```js
  const Department = require('./models/Department.js');

  const SupportDept = await Department.Get('E01');
  assert(SupportDept.deptname === "SUPPORT SERVICES");

  const ParentDept = await SupportDept.getDepartment();
  assert(ParentDept.deptno === "A00");

  //getEmployee returns an Employee class
  const SupportManager = await SupportDept.getEmployee();
  assert(SupportManager.firstnme === 'JOHN');
```

After you have generated your Models you can easily change the class properties without affecting the way the data is retrieved - which is great if you mostly have short-name columns.

### Created procedure classes

db2Model can create classes with methods to call stored procedures in a chosen schema. This example generates functions for calling all stored procedures in QSYS - even though most of them are useless to regular developers.

```
$ node index procs QSYS
The following environment variabes are needed to connect: ISYS, IUSER, IPASS

Connecting to seiden.iinthecloud.com with alan3.

(node:6642) Warning: N-API is an experimental feature and could change at any time.
Fetching columns for QSYS/CREATE_SQL_SAMPLE.
Fetching columns for QSYS/CREATE_XML_SAMPLE.
...
Written to "models/QSYS.js".
```

And is now callable like so:

```js
  const QSYS = require('./models/QSYS.js');

  try {
    await QSYS.create_sql_sample("SAMPLE");
  } catch (e) {
    console.log('Sample tables may already exist in SAMPLE schema.');
  }
```

## Tests

There is a simple unit test provided. The test will try to create the Db2 for i sample tables in the `SAMPLE` schema.

```
>  node test.js

The following environment variabes are needed to connect: ISYS, IUSER, IPASS
Connecting to xxx with xxx.

Sample tables may already exist in SAMPLE schema.
Defined table DEPARTMENT
Defined table EMPLOYEE
Written to "models/Department.js".
Written to "models/Employee.js".
Tests pass
```