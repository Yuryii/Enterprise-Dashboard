using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Infrastructure.Data;

public class ApplicationDbContextInitialiser
{
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;
    private readonly ApplicationDbContext _context;

    public ApplicationDbContextInitialiser(ILogger<ApplicationDbContextInitialiser> logger, ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            await _context.Database.CanConnectAsync();
            _logger.LogInformation("Database connection verified successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while connecting to the database.");
            throw;
        }
    }
}
