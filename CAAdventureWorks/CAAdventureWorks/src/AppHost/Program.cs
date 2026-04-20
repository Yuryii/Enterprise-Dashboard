using CAAdventureWorks.Shared;

var builder = DistributedApplication.CreateBuilder(args);

builder.AddAzureContainerAppEnvironment("aca-env");

// Keycloak - Identity Provider (imports realm.json on startup)
var realmJsonPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "..", "src", "AppHost", "keycloak", "realm.json"));
Console.WriteLine($"[DEBUG] Keycloak realm.json path: {realmJsonPath}");
Console.WriteLine($"[DEBUG] File exists: {File.Exists(realmJsonPath)}");
var keycloak = builder.AddContainer(Services.Keycloak, "quay.io/keycloak/keycloak:26.0")
    .WithHttpEndpoint(port: 8080, targetPort: 8080, name: "http")
    .WithEnvironment("KEYCLOAK_ADMIN", "admin")
    .WithEnvironment("KEYCLOAK_ADMIN_PASSWORD", "admin")
    .WithBindMount(realmJsonPath, "/opt/keycloak/data/import/realm.json", isReadOnly: true)
    .WithArgs("start-dev", "--import-realm");

// SQL Server
var databaseServer = builder
    .AddAzureSqlServer(Services.DatabaseServer)
    .RunAsContainer(container =>
        container.WithLifetime(ContainerLifetime.Persistent))
    .AddDatabase(Services.Database);

// Web API
var web = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithReference(databaseServer)
    .WaitFor(databaseServer)
    .WaitFor(keycloak)
    .WithEnvironment("Keycloak__Authority", () => $"{keycloak.GetEndpoint("http")}/realms/AdventureWorks")
    .WithEnvironment("Keycloak__AdminUsername", "admin")
    .WithEnvironment("Keycloak__AdminPassword", "admin")
    .WithExternalHttpEndpoints()
    .WithAspNetCoreEnvironment()
    .WithUrlForEndpoint("http", url =>
    {
        url.DisplayText = "Scalar API Reference";
        url.Url = "/scalar";
    });


builder.Build().Run();
