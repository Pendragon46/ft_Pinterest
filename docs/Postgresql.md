# Postgres

Postgres is a powerful, open source object-relational database system. We use it in this project with Prisma ORM to manage our data. Below are some key points about Postgres and how we use it in our project.

## basic Commands

connect to the database using psql command line tool:
```shell

psql -U utilisateur -d nom_database
```

lists all databases . There are 4 databases in total: ft_pinterest, postgres, template0, template1. we only use ft_pinterest database for this project. the other databases are default databases created by Postgres.
```shell
\l
```

show tables in the current database(model created by prisma).
```shell
\dt
```

show the schema of a table. for example, to show the schema of the user table:
```shell
\d User
# psql is case-sensitive and the command typed in shell is formated in lower case. so if the table name is in upper case, it should be typed in double quotes. for example, to show the schema of the Artwork table:
\d "User"
```


