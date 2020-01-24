# db2Model

db2Model is a model generator for Db2 for i tables. It's a simple command line tool that generates JavaScript classes which can be used as a simple ORM.

db2Model will create:

* a class for the table specified
* static methods to fetch a row based on the primary or unique key
* instance methods to fetch models based on foreign references keys
* classes for tables referenced in foreign keys.

db2Model is using the odbc driver to connect, which must be installed onto the system running this script.

## Usage

```
$ node index SAMPLE DEPARTMENT

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