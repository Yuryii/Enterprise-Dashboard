using System.Security.Claims;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Infrastructure.ChatBot;
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

        // ChatBot database (ApplicationDbContext2)
        var chatbotConn = builder.Configuration.GetConnectionString("ChatBot");
        Guard.Against.Null(chatbotConn, message: "Connection string 'ChatBot' not found.");

        builder.Services.AddDbContext<ApplicationDbContext2>(options =>
        {
            options.UseSqlServer(chatbotConn);
            options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
        });

        builder.Services.AddScoped<IChatBotDbContext>(sp => sp.GetRequiredService<ApplicationDbContext2>());
        builder.Services.AddScoped<ApplicationDbContext2Initialiser>();

        // Semantic Kernel services
        builder.Services.AddHttpClient("ChatBot");
        builder.Services.AddScoped<CAAdventureWorks.Application.ChatBot.Services.ISemanticKernelService, DepartmentKernelService>();

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
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                RoleClaimType = ClaimTypes.Role,
                NameClaimType = ClaimTypes.Name,
            };

            // SignalR sends the JWT as a query-string parameter, not an Authorization header.
            // This handler extracts the token from the URL for SignalR hub connections.
            options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    var path = context.HttpContext.Request.Path;
                    if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                    {
                        context.Token = accessToken;
                    }
                    return Task.CompletedTask;
                },
            };
        });

        builder.Services.AddAuthorizationBuilder()
    // Executive — chỉ xem được component Executive
    .AddPolicy("Executive", policy =>
        policy.RequireRole("Executive"))
    // Executive-General-And-Administration-Manager — xem Executive + 4 sub-component
    .AddPolicy("Executive-General-And-Administration-Manager", policy =>
        policy.RequireRole("Executive", "Information-Services", "Finance", "HumanResources", "Facilities-And-Maintenance"))
    // Sub-components: Information-Services, Finance, Human-Resources, Facilities-And-Maintenance
    .AddPolicy("Information-Services", policy =>
        policy.RequireRole("Information-Services"))
    .AddPolicy("Finance", policy =>
        policy.RequireRole("Finance"))
    .AddPolicy("Human-Resources", policy =>
        policy.RequireRole("HumanResources"))
    .AddPolicy("Facilities-And-Maintenance", policy =>
        policy.RequireRole("Facilities-And-Maintenance"))
    // Quality-Assurance-Manager — xem Quality-Assurance + Document-Control
    .AddPolicy("Quality-Assurance-Manager", policy =>
        policy.RequireRole("Quality-Assurance", "Document-Control"))
    .AddPolicy("Quality-Assurance", policy =>
        policy.RequireRole("Quality-Assurance"))
    .AddPolicy("Document-Control", policy =>
        policy.RequireRole("Document-Control"))
    // Research-and-Development — xem Engineering + Tool-Design
    .AddPolicy("Research-and-Development", policy =>
        policy.RequireRole("Engineering", "Tool-Design"))
    .AddPolicy("Engineering", policy =>
        policy.RequireRole("Engineering"))
    .AddPolicy("Tool-Design", policy =>
        policy.RequireRole("Tool-Design"))
    // Manufacturing — xem Production + Production-Control
    .AddPolicy("Manufacturing", policy =>
        policy.RequireRole("Production", "Production-Control"))
    .AddPolicy("Production", policy =>
        policy.RequireRole("Production"))
    // Sales-and-Marketing — xem Sales + Marketing
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
