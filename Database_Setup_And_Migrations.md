# Database Setup and EF Core Migrations Guide

This project uses a Dockerized PostgreSQL database and Entity Framework (EF) Core for database management.

## 1. Connecting to the Local Database (DBeaver / pgAdmin)

To manage your database visually, you can use clients like **DBeaver** or **pgAdmin**.

### Database Credentials (from docker-compose.yml)

- **Host:** `localhost`
- **Port:** `5432`
- **Database Name:** `DriftDb`
- **Username:** `postgres`
- **Password:** `root`

### Step-by-Step Setup in DBeaver

1. **Ensure the Database is Running:**
   ```bash
   docker-compose up -d
   ```
2. **Open DBeaver** and click the **"New Database Connection"** icon.
3. **Select PostgreSQL** and click **Next**.
4. **Enter Connection Details:** Fill in the Host, Port, Database (`DriftDb`), Username, and Password exactly as listed above.
5. **Test Your Connection:** Click "Test Connection". If prompted to download drivers, click "Download" and allow it.
6. **Save and Connect:** Click Finish. You will find your tables under `DriftDb` -> `Schemas` -> `public` -> `Tables`.

---

## 2. Entity Framework (EF) Core Migrations

EF Core Migrations are the way we keep our database schema in sync with our C# models (like `DriftDetail`). Instead of writing SQL scripts (`CREATE TABLE...`) manually, EF Core generates them for us based on our actual C# code.

### How to Create a Migration

When you add a new model or modify an existing one, you need to generate a new migration to update the database. Stop the running Docker containers, and run this command in the terminal at the repository root:

```bash
dotnet ef migrations add <MigrationName>
```

_Example:_ `dotnet ef migrations add InitialCreate`

### What Files and Folders are Created?

Running the command above creates a new **`Migrations`** folder in your project. Inside it, you will see files similar to these:

1. `YYYYMMDDHHMMSS_InitialCreate.cs`: This is the actual C# code that EF Core uses to figure out how to create or modify your tables in PostgreSQL.
2. `AppDbContextModelSnapshot.cs`: A "snapshot" of what your current database structure looks like right now. EF Core uses this to compare against your C# code to figure out what exactly changed the next time you run the `add` command.

### Can We Remove These Files and Genereate Them Multiple Times?

- **During Local Development (Iterating):** Yes! If you mess up your C# models before pushing your code, you can safely delete the entire `Migrations` folder. **HOWEVER**, if you do this, you must also completely wipe (drop) your actual local database (or delete your postgres Docker volume) so that the database and the code start completely fresh. Then, you can run `dotnet ef migrations add InitialCreate` again.
- **Can We Delete the Migrations Folder Once the Project is "Done" or in Production?** **NO.** You should **never** delete the `Migrations` folder once your application has been deployed to a real environment. EF Core relies entirely on the historical chain of files inside this folder to know how to incrementally update the live database in the future. Deleting it breaks the chain, meaning you won't be able to safely add new tables or columns later without risking catastrophic data loss.

### How Migrations are Applied in This Project

Normally, developers run `dotnet ef database update` from the terminal to manually apply the migration to the database.

However, in this project, **migrations are applied automatically on startup**.
When you run `docker-compose up`, `Program.cs` checks the `Migrations` folder. If a migration hasn't been applied to `DriftDb` yet, it applies it automatically before the API fully boots up and starts accepting requests.
