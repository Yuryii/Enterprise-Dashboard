using Aspire.Hosting.Docker;
using Aspire.Hosting.Keycloak;
using CAAdventureWorks.Shared;

var builder = DistributedApplication.CreateBuilder(args);

// Keycloak - import realm from realm-export.json
// Default admin: admin / admin123 (set via WithAdminCredentials for master realm)
var keycloak = builder.AddKeycloak("keycloak", 8080)
    .WithRealmImport("keycloak/realm-export.json")
    .WithDataVolume();

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

builder.Build().Run();
