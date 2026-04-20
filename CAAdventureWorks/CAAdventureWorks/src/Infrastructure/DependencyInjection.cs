using System.Security.Claims;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Infrastructure.Data;
using CAAdventureWorks.Infrastructure.Data.Interceptors;
using CAAdventureWorks.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString("AdventureWorks");
        Guard.Against.Null(connectionString, message: "Connection string 'AdventureWorks' not found.");

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseSqlServer(connectionString);
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
        });

        builder.EnrichSqlServerDbContext<ApplicationDbContext>();

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddScoped<ApplicationDbContextInitialiser>();

        var keycloakAuthority = builder.Configuration["Keycloak:Authority"];
        var keycloakAudience = builder.Configuration["Keycloak:Audience"];
        var requireHttpsMetadata = !builder.Environment.IsDevelopment();

        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.Authority = keycloakAuthority;
            options.Audience = keycloakAudience;
            options.RequireHttpsMetadata = requireHttpsMetadata;

            options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                RoleClaimType = ClaimTypes.Role,
                NameClaimType = ClaimTypes.Name,
            };
        });

        builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Executive-General-And-Administration-Manager", policy =>
        policy.RequireRole("Executive", "Information-Services", "Finance", "HumanResources", "Facilities-And-Maintenance"))
    .AddPolicy("Executive", policy =>
        policy.RequireRole("Executive"))
    .AddPolicy("Information-Services", policy =>
        policy.RequireRole("Information-Services"))
    .AddPolicy("Finance", policy =>
        policy.RequireRole("Finance"))
    .AddPolicy("Human-Resources", policy =>
        policy.RequireRole("HumanResources"))
    .AddPolicy("Facilities-And-Maintenance", policy =>
        policy.RequireRole("Facilities-And-Maintenance"))
    .AddPolicy("Quality-Assurance-Manager", policy =>
        policy.RequireRole("Document-Control", "Quality-Assurance"))
    .AddPolicy("Document-Control", policy =>
        policy.RequireRole("Document-Control"))
    .AddPolicy("Quality-Assurance", policy =>
        policy.RequireRole("Quality-Assurance"))
    .AddPolicy("Research-and-Development", policy =>
        policy.RequireRole("Engineering", "Tool-Design"))
    .AddPolicy("Engineering", policy =>
        policy.RequireRole("Engineering"))
    .AddPolicy("Tool-Design", policy =>
        policy.RequireRole("Tool-Design"))
    .AddPolicy("Manufacturing", policy =>
        policy.RequireRole("Production", "Production-Control"))
    .AddPolicy("Production", policy =>
        policy.RequireRole("Production"))
    .AddPolicy("Sales-and-Marketing", policy =>
        policy.RequireRole("Sales", "Marketing"))
    .AddPolicy("Sales", policy =>
        policy.RequireRole("Sales"))
    .AddPolicy("Marketing", policy =>
        policy.RequireRole("Marketing"))
    .AddPolicy("Inventory-Management", policy =>
        policy.RequireRole("Purchasing"))
    .AddPolicy("Shipping-and-Receiving", policy =>
        policy.RequireRole("Shipping-and-Receiving"));

        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddTransient<IIdentityService, IdentityService>();
    }
}
