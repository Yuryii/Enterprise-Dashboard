using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Infrastructure.Data;

public class ApplicationDbContext2Initialiser
{
    private readonly ILogger<ApplicationDbContext2Initialiser> _logger;
    private readonly ApplicationDbContext2 _context;

    public ApplicationDbContext2Initialiser(
        ILogger<ApplicationDbContext2Initialiser> logger,
        ApplicationDbContext2 context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            _logger.LogInformation("Initialising ChatBot database...");

            // Always delete and recreate in development
            await _context.Database.EnsureDeletedAsync();
            _logger.LogInformation("ChatBot database deleted (if existed).");

            await _context.Database.EnsureCreatedAsync();
            _logger.LogInformation("ChatBot database created successfully.");

            await _context.Database.CanConnectAsync();
            _logger.LogInformation("ChatBot database connection verified successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the ChatBot database.");
            throw;
        }
    }
}
