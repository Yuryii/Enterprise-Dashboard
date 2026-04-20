---
name: Switch from SQL Server container to LocalDB
overview: Remove SQL Server container provisioning from AppHost and clean up the Aspire resource reference. The appsettings.json files already contain the correct LocalDB connection string, so no changes needed there.
todos:
  - id: remove-sql-container
    content: Remove SQL Server container block from AppHost/Program.cs
    status: completed
  - id: remove-db-reference
    content: Remove .WithReference(databaseServer) from Web API in AppHost/Program.cs
    status: completed
  - id: remove-sql-package
    content: Remove Aspire.Hosting.Azure.Sql package from AppHost.csproj
    status: completed
isProject: false
---

## Changes Summary

The appsettings files already contain the correct LocalDB connection string `Server=(localdb)\MSSQLLocalDB;Database=AdventureWorks;...`, so no changes needed there. The only file that needs modification is the AppHost's `Program.cs`.

### 1. Remove SQL Server container from AppHost

**File:** `CAAdventureWorks/CAAdventureWorks/src/AppHost/Program.cs`

Remove lines 18-23 (the entire SQL Server container block):

```csharp
// SQL Server
var databaseServer = builder
    .AddAzureSqlServer(Services.DatabaseServer)
    .RunAsContainer(container =>
        container.WithLifetime(ContainerLifetime.Persistent))
    .AddDatabase(Services.Database);
```

### 2. Remove database reference from Web API

**File:** `CAAdventureWorks/CAAdventureWorks/src/AppHost/Program.cs`

Remove `.WithReference(databaseServer)` from line 27, changing:

```csharp
var web = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithReference(databaseServer)
    .WaitFor(databaseServer)
```

to:

```csharp
var web = builder.AddProject<Projects.Web>(Services.WebApi)
    .WaitFor(databaseServer)
```

(Note: `.WaitFor(databaseServer)` should also be removed since the database no longer exists as a resource, but if kept it won't cause a runtime error — it's just a no-op. For cleanliness it can be removed too.)

### 3. Optional: Remove the Aspire SQL Server package

**File:** `CAAdventureWorks/CAAdventureWorks/src/AppHost/AppHost.csproj`

Remove the `Aspire.Hosting.Azure.Sql` package reference if no longer needed.
