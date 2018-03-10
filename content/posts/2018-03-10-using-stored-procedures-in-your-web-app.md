---
title: "Using stored procedures in your web app"
date: 2018-03-10 15:10:16 +0000
categories:
- sql
comments: true
---

In the last few days I've done something I've never done before, namely written a stored procedure for a web app. Like most web developers, I know enough about SQL to be able to formulate some fairly complex queries, but I hadn't really touched on control flow functions or stored procedures, and in my experience they tend to be the province of the dedicated database administrator, not us web devs, who will typically delegate more complex functionality to our application code.

In this case, there were a number of factors influencing my decision to use a stored procedure for this:

* The application was a legacy application which had been worked on by developers of, shall we say, varying skill levels. As a result the database schema was badly designed, with no prospect of changing it without causing huge numbers of breakages
* The query in question was used to generate a complex report that was quite time-consuming, therefore the optimisations from using a stored procedure were worthwhile.
* The report required that data be grouped by a set of categories which were stored in a separate table, which meant the table had to be pivoted (transformed from rows to columns), resulting in an incredibly complex dynamic query that had to be constructed on the fly by concatenating different SQL strings. In PostgreSQL, this can be done fairly easily using the `crosstab` function, but MySQL doesn't have native support for anything like this.

Historically, one issue with using stored procedures has been that it kept business logic out of the application code, meaning they are not stored in version control. However, most modern frameworks provide some support for migrations, and since they are intended to be used to make changes to the database, they are the obvious place to define the stored procedure. This particular application was built with an older framework that didn't come with migrations, so we'd installed [Phinx](https://phinx.org/) to handle those for us. Initially, I defined the stored procedure inside a migration that ran a raw query to create the stored procedure, as in this example:

```php
public function up()
{
   $query = <<<EOF
CREATE PROCEDURE IF NOT EXISTS foo
BEGIN
   SELECT * FROM foo;
END
EOF;
   $this->execute($query);
}

public function down()
{
   $this->execute('DROP PROCEDURE IF EXISTS foo');
}
```

Once this is done, you can then use your framework's particular support for raw queries to call `CALL foo()` whenever your stored procedure needs to be executed.

However, we soon ran into an issue. It turns out `mysqldump` doesn't export stored procedures by default, so there was a risk that anyone working on the code base might import the database from an SQL file and not get the migrations. I'd used the Symfony Console component to create a simple command-line tool, reminiscent of Laravel's Artisan, so I used that to create a command to set up the stored procedure, amended the migration to call that command, and placed a check in the application where the procedure was called so that if it was not defined the command would be called and the procedure would be created. In most cases this wouldn't be an issue.

Having now had experience using stored procedures in a web application, there are a number of issues they raise:

* It's hard to make queries flexible, whereas with something like Eloquent it's straightforward to conditionally apply `WHERE` statements.
* While storing them in migrations is a practical solution, if the database is likely to be imported rather than created from scratch during development it can be problematic.
* They aren't easily portable, not just between database management systems, but between different versions - the production server was using an older version of MySQL, and it failed to create the procedure. It's therefore good practice for your migrations to check the procedure was created successfully and raise a noisy exception if they failed.

Conversely, they do bring certain benefits:

* For particularly complex transactions that don't change, such as generating reports, they are a good fit since they reduce the amount of data that needs to be sent to the database and allow the query to be pre-optimised somewhat.
* If a particular query is unusually expensive, is called often, and can't be cached, it may improve performance to make it a stored procedure.
* Doing a query in a for loop is usually a very big no-no. However, if there really is no way to avoid it (and this should almost never happen), it would make sense to try to do it in a stored procedure using SQL rather than in application code since that would minimise the overhead.
* If multiple applications need to work with the same database, using stored procedures for queries in more than one application removes the need to reimplement or copy over the code for the query in the second application - they can just call the same procedure, and if it needs to be changed it need only be done once.

Honestly, I'm not sure I'm ever likely to again come across a scenario where using a stored procedure in a web application would be beneficial, but it's been very interesting delving into aspects of SQL that I don't normally touch on and I've picked up on some rarely-used SQL statements that I haven't used before, such as `GROUP_CONCAT()` and `CASE`. With the widespread adoption of migrations in most frameworks, I think that the argument that using stored procedures keeps application logic out of version control holds any water, since developers can generally be trusted to store changes to database structure in their migrations and not start messing them around, so the same applies for stored procedures. Report generation seems to be the ideal use case since this invariably involves complex queries that run regularly and don't change often, and this is where I expect it would be most likely I'd have cause to use them again.
