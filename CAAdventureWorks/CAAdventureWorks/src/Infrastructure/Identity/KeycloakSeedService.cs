using System.Net;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.Common.Models;
using CAAdventureWorks.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Infrastructure.Identity;

public class KeycloakSeedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<KeycloakSeedService> _logger;
    private readonly string _keycloakAuthority;

    private static readonly (string Username, string Email, string FirstName, string LastName)[] DepartmentUsers =
    [
        ("document-control",       "docctrl-adventureworks@placeholder.com",    "Document",    "Control"),
        ("quality-assurance",      "qa-dept@placeholder.com",                  "Quality",     "Assurance"),
        ("rd-department",          "rd-dept@placeholder.com",                  "R&D",         "Department"),
        ("engineering",            "engineering@placeholder.com",              "Engineering",  ""),
        ("tool-design",            "tool-design@placeholder.com",              "Tool",        "Design"),
        ("production",             "production@placeholder.com",               "Production",   ""),
        ("production-control",     "prod-control@placeholder.com",             "Production",  "Control"),
        ("sales",                  "sales@placeholder.com",                     "Sales",       ""),
        ("marketing",              "marketing@placeholder.com",               "Marketing",   ""),
        ("purchasing",             "purchasing@placeholder.com",               "Purchasing",  ""),
        ("shipping-receiving",     "shipping@placeholder.com",                 "Shipping",    "Receiving"),
        ("facilities-maintenance", "facilities@placeholder.com",               "Facilities",  "Maintenance"),
        ("human-resources",        "hr-dept@placeholder.com",                  "Human",       "Resources"),
        ("it-department",          "it-dept@placeholder.com",                  "IT",          "Department"),
        ("manufacturing",          "manufacturing@placeholder.com",            "Manufacturing",""),
        ("inventory-mgmt",         "inventory@placeholder.com",               "Inventory",   "Management"),
    ];

    private const string DepartmentPassword = "Department@123";

    public KeycloakSeedService(
        IServiceProvider serviceProvider,
        ILogger<KeycloakSeedService> logger,
        Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _keycloakAuthority = configuration["Keycloak:Authority"] ?? "http://localhost:8080/realms/AdventureWorks";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await WaitForKeycloakAsync(stoppingToken);
            await SeedDepartmentUsersAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "KeycloakSeedService failed. Department users were not seeded.");
        }
    }

    private async Task WaitForKeycloakAsync(CancellationToken ct)
    {
        var adminBase = _keycloakAuthority[.._keycloakAuthority.LastIndexOf("/realms/")];
        var healthUrl = $"{adminBase}/admin/realms";
        var readyUrl = $"{adminBase}/realms/AdventureWorks";

        _logger.LogInformation("Waiting for Keycloak to be ready at {HealthUrl}...", healthUrl);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromMinutes(5));

        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

        while (!cts.Token.IsCancellationRequested)
        {
            try
            {
                var response = await httpClient.GetAsync(healthUrl, cts.Token);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Keycloak is ready.");
                    return;
                }
            }
            catch (Exception)
            {
                // ignore network errors and retry
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(5), cts.Token);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }

        _logger.LogWarning("Keycloak health check timed out after 5 minutes. Skipping department user seeding.");
    }

    private async Task SeedDepartmentUsersAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var keycloak = scope.ServiceProvider.GetRequiredService<IKeycloakService>();

        foreach (var (username, email, firstName, lastName) in DepartmentUsers)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                if (await keycloak.UserExistsAsync(username))
                {
                    _logger.LogDebug("User '{Username}' already exists, skipping.", username);
                    continue;
                }

                var userId = await keycloak.CreateUserAsync(new CreateUserRequest(
                    Username: username,
                    Email: email,
                    Password: DepartmentPassword,
                    EmailVerified: true,
                    Roles: []));

                _logger.LogInformation("Created department user '{Username}' with ID '{UserId}'.", username, userId);
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("already exists"))
            {
                _logger.LogDebug("User '{Username}' already exists (race condition).", username);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to seed department user '{Username}'.", username);
            }
        }

        _logger.LogInformation("KeycloakSeedService completed. {Count} department users processed.", DepartmentUsers.Length);
    }
}
