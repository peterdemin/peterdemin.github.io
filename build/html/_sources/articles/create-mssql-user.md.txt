# MSSQL cheatsheet

```
USE DatabaseName
CREATE USER username FOR LOGIN username
GO
EXEC sp_addrolemember db_owner, username
GO
```

For read-only access you would want to use `db_datareader` role instead of `db_owner`.
For read and write (but not changing schema, etc.) add it to both `db_datareader` and `db_datawriter`

Or, if you need more fine-grain control you may specifically
`GRANT`/`REVOKE`/`DENY` `select`/`insert`/`update`/`delete` permissions
on tables or views and/or exec permissions on functions and stored procs:

```
USE DatabaseName
GRANT INSERT ON table_name TO username
```
