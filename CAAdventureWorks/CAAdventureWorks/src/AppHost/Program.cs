using Aspire.Hosting.Docker;
using Aspire.Hosting.Keycloak;
using CAAdventureWorks.Shared;

var builder = DistributedApplication.CreateBuilder(args);

// Keycloak - import realm from realm-export.json
var keycloak = builder.AddKeycloak("keycloak", 8080)
    .WithEnvironment("KC_BOOTSTRAP_ADMIN_USERNAME", "admin")
    .WithEnvironment("KC_BOOTSTRAP_ADMIN_PASSWORD", "admin")
    .WithRealmImport("keycloak/realm-export.json");

// Web API - connects to Keycloak managed by Aspire
var web = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithReference(keycloak)
    .WaitFor(keycloak)
    .WithExternalHttpEndpoints()
    .WithAspNetCoreEnvironment()
    .WithUrlForEndpoint("http", url =>
    {
        url.DisplayText = "Scalar API Reference";
        url.Url = "/scalar";
    });

// Angular Frontend
var frontend = builder.AddJavaScriptApp(Services.WebFrontend, "../WebFrontend", "start")
    .WithReference(web)
    .WaitFor(web)
    .WithExternalHttpEndpoints()
    .WithHttpEndpoint(env: "PORT")
    .WithEnvironment("apiBaseUrl", web.GetEndpoint("http"))
    .WithEnvironment("keycloakUrl", $"{keycloak.GetEndpoint("http")}/realms/CAAdventureWorks")
    .WithEnvironment(context =>
    {
        context.EnvironmentVariables["NG_CLI_ANALYTICS"] = "false";
    });

builder.Build().Run();
