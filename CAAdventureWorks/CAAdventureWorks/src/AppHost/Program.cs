using Aspire.Hosting.Docker;
using CAAdventureWorks.Shared;

var builder = DistributedApplication.CreateBuilder(args);

// Web API - connects to Keycloak managed by Aspire
var web = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithExternalHttpEndpoints()
    .WithAspNetCoreEnvironment()
    .WithUrlForEndpoint("http", url =>
    {
        url.DisplayText = "Scalar API Reference";
        url.Url = "/scalar";
    });

builder.Build().Run();
