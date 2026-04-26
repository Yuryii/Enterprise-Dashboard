using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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

            await SeedAlertDefinitionsAsync();

            await _context.Database.CanConnectAsync();
            _logger.LogInformation("ChatBot database connection verified successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the ChatBot database.");
            throw;
        }
    }

    private async Task SeedAlertDefinitionsAsync()
    {
        if (await _context.AlertDefinitions.AnyAsync())
        {
            _logger.LogInformation("Alert definitions already seeded.");
            return;
        }

        _logger.LogInformation("Seeding alert definitions for Sales department...");

        var alertDefinitions = new List<AlertDefinition>
        {
            new AlertDefinition
            {
                Code = "SALES_REVENUE_DECLINE",
                Name = "Doanh thu giảm",
                Description = "Cảnh báo khi doanh thu giảm dưới X% so với kỳ trước",
                DepartmentCode = "Sales",
                DefaultThreshold = 10m,
                ThresholdUnit = "Percent",
                RequiresParameters = true,
                QueryTemplate = "",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AlertDefinition
            {
                Code = "SALES_ORDER_COUNT_DECLINE",
                Name = "Số đơn hàng giảm",
                Description = "Cảnh báo khi số đơn hàng giảm dưới X% so với kỳ trước",
                DepartmentCode = "Sales",
                DefaultThreshold = 10m,
                ThresholdUnit = "Percent",
                RequiresParameters = true,
                QueryTemplate = "",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AlertDefinition
            {
                Code = "SALES_TOP_PRODUCT_CHANGE",
                Name = "Top sản phẩm thay đổi",
                Description = "Cảnh báo khi top sản phẩm bán chạy thay đổi so với kỳ trước",
                DepartmentCode = "Sales",
                DefaultThreshold = null,
                ThresholdUnit = "Count",
                RequiresParameters = false,
                QueryTemplate = "",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AlertDefinition
            {
                Code = "SALES_ORDER_STATUS_ISSUE",
                Name = "Đơn hàng có vấn đề",
                Description = "Cảnh báo khi tỷ lệ đơn hàng bị từ chối/hủy vượt ngưỡng X%",
                DepartmentCode = "Sales",
                DefaultThreshold = 20m,
                ThresholdUnit = "Percent",
                RequiresParameters = true,
                QueryTemplate = "",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new AlertDefinition
            {
                Code = "SALES_CUSTOMER_CONCENTRATION",
                Name = "Phụ thuộc khách hàng",
                Description = "Cảnh báo khi 1 khách hàng chiếm quá X% doanh thu",
                DepartmentCode = "Sales",
                DefaultThreshold = 30m,
                ThresholdUnit = "Percent",
                RequiresParameters = true,
                QueryTemplate = "",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        };

        _context.AlertDefinitions.AddRange(alertDefinitions);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} alert definitions.", alertDefinitions.Count);
    }
}
