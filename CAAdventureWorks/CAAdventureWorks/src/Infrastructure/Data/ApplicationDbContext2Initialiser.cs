using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Infrastructure.Data;

public class ApplicationDbContext2Initialiser
{
    private readonly ILogger<ApplicationDbContext2Initialiser> _logger;
    private readonly ApplicationDbContext2 _context;
    private readonly IServiceProvider _serviceProvider;

    public ApplicationDbContext2Initialiser(
        ILogger<ApplicationDbContext2Initialiser> logger,
        ApplicationDbContext2 context,
        IServiceProvider serviceProvider)
    {
        _logger = logger;
        _context = context;
        _serviceProvider = serviceProvider;
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
            await SeedVendorDebtsAsync();

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

        _logger.LogInformation("Seeding alert definitions for all departments...");

        var alertDefinitions = new List<AlertDefinition>();

        // ===== SALES =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "SALES_REVENUE_DECLINE", Name = "Doanh thu giảm", Description = "Cảnh báo khi doanh thu giảm dưới X% so với kỳ trước", DepartmentCode = "Sales", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SALES_ORDER_COUNT_DECLINE", Name = "Số đơn hàng giảm", Description = "Cảnh báo khi số đơn hàng giảm dưới X% so với kỳ trước", DepartmentCode = "Sales", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SALES_TOP_PRODUCT_CHANGE", Name = "Top sản phẩm thay đổi", Description = "Cảnh báo khi top sản phẩm bán chạy thay đổi so với kỳ trước", DepartmentCode = "Sales", DefaultThreshold = null, ThresholdUnit = "Count", RequiresParameters = false, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SALES_ORDER_STATUS_ISSUE", Name = "Đơn hàng có vấn đề", Description = "Cảnh báo khi tỷ lệ đơn hàng bị từ chối/hủy vượt ngưỡng X%", DepartmentCode = "Sales", DefaultThreshold = 20m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SALES_CUSTOMER_CONCENTRATION", Name = "Phụ thuộc khách hàng", Description = "Cảnh báo khi 1 khách hàng chiếm quá X% doanh thu", DepartmentCode = "Sales", DefaultThreshold = 30m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== PRODUCTION =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "PRODUCTION_SCRAP_RATE", Name = "Tỷ lệ phế phẩm cao", Description = "Cảnh báo khi tỷ lệ phế phẩm vượt ngưỡng X% trong kỳ", DepartmentCode = "Production", DefaultThreshold = 5m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PRODUCTION_WORKORDER_DELAY", Name = "Lệnh sản xuất trễ", Description = "Cảnh báo khi tỷ lệ lệnh sản xuất không hoàn thành đúng hạn vượt X%", DepartmentCode = "Production", DefaultThreshold = 15m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PRODUCTION_MACHINE_DOWNTIME", Name = "Máy móc dừng hoạt động", Description = "Cảnh báo khi thời gian dừng máy vượt X giờ trong kỳ", DepartmentCode = "Production", DefaultThreshold = 20m, ThresholdUnit = "Hours", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PRODUCTION_INVENTORY_LOW", Name = "Tồn kho thành phẩm thấp", Description = "Cảnh báo khi số lượng tồn kho thành phẩm dưới ngưỡng X đơn vị", DepartmentCode = "Production", DefaultThreshold = 50m, ThresholdUnit = "Units", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== PRODUCTION CONTROL =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "PRODCTRL_SCHEDULE_ADHERENCE", Name = "Tuân thủ lịch trình thấp", Description = "Cảnh báo khi tỷ lệ tuân thủ lịch sản xuất dưới X%", DepartmentCode = "ProductionControl", DefaultThreshold = 80m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PRODCTRL_WIP_HIGH", Name = "WIP cao bất thường", Description = "Cảnh báo khi sản phẩm dở dang vượt X đơn vị", DepartmentCode = "ProductionControl", DefaultThreshold = 500m, ThresholdUnit = "Units", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PRODCTRL_CYCLE_TIME", Name = "Thời gian chu kỳ tăng", Description = "Cảnh báo khi thời gian chu kỳ sản xuất tăng quá X% so với tiêu chuẩn", DepartmentCode = "ProductionControl", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== PURCHASING =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "PURCHASING_PO_DELAY", Name = "Đơn hàng mua trễ", Description = "Cảnh báo khi tỷ lệ đơn hàng mua không giao đúng hạn vượt X%", DepartmentCode = "Purchasing", DefaultThreshold = 20m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PURCHASING_VENDOR_PERF", Name = "Nhà cung cấp kém", Description = "Cảnh báo khi tỷ lệ giao hàng đúng hạn của nhà cung cấp dưới X%", DepartmentCode = "Purchasing", DefaultThreshold = 85m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PURCHASING_STOCKOUT", Name = "Hàng hóa thiếu hụt", Description = "Cảnh báo khi số lần hết hàng trong kho vượt X lần", DepartmentCode = "Purchasing", DefaultThreshold = 5m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "PURCHASING_PRICE_VARIANCE", Name = "Biến động giá mua", Description = "Cảnh báo khi giá mua cao hơn X% so với báo giá trung bình", DepartmentCode = "Purchasing", DefaultThreshold = 15m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== HUMAN RESOURCES =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "HR_OPEN_POSITIONS", Name = "Vị trí tuyển dụng mở", Description = "Cảnh báo khi số vị trí tuyển dụng mở vượt X", DepartmentCode = "HumanResources", DefaultThreshold = 10m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "HR_TURNOVER_RATE", Name = "Tỷ lệ nghỉ việc cao", Description = "Cảnh báo khi tỷ lệ nghỉ việc trong kỳ vượt X%", DepartmentCode = "HumanResources", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "HR_OVERTIME_HIGH", Name = "Tăng ca nhiều", Description = "Cảnh báo khi số giờ tăng ca trung bình vượt X giờ/nhân viên/tháng", DepartmentCode = "HumanResources", DefaultThreshold = 40m, ThresholdUnit = "Hours", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "HR_SICK_LEAVE_HIGH", Name = "Nghỉ ốm nhiều", Description = "Cảnh báo khi tỷ lệ nghỉ ốm vượt X%", DepartmentCode = "HumanResources", DefaultThreshold = 5m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== FINANCE =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "FINANCE_BUDGET_VARIANCE", Name = "Chênh lệch ngân sách", Description = "Cảnh báo khi chi phí vượt ngân sách phòng ban X%", DepartmentCode = "Finance", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "FINANCE_OVERDUE_PAYMENT", Name = "Thanh toán quá hạn", Description = "Cảnh báo khi tỷ lệ thanh toán quá hạn vượt X%", DepartmentCode = "Finance", DefaultThreshold = 15m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "FINANCE_AR_AGING", Name = "Công nợ phải thu quá hạn", Description = "Cảnh báo khi công nợ phải thu quá 90 ngày vượt X%", DepartmentCode = "Finance", DefaultThreshold = 20m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "FINANCE_CREDIT_LIMIT", Name = "Vượt hạn mức tín dụng", Description = "Cảnh báo khi khách hàng vượt hạn mức tín dụng", DepartmentCode = "Finance", DefaultThreshold = 100m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== ENGINEERING =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "ENG_PROJECT_DELAY", Name = "Dự án trễ tiến độ", Description = "Cảnh báo khi dự án chậm tiến độ hơn X ngày", DepartmentCode = "Engineering", DefaultThreshold = 14m, ThresholdUnit = "Days", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "ENG_CHANGE_ORDER_RATE", Name = "Thay đổi thiết kế nhiều", Description = "Cảnh báo khi số lần thay đổi đơn hàng kỹ thuật vượt X lần", DepartmentCode = "Engineering", DefaultThreshold = 3m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "ENG_DOCUMENT_REVISION", Name = "Bản vẽ cần cập nhật", Description = "Cảnh báo khi số bản vẽ cần cập nhật vượt X", DepartmentCode = "Engineering", DefaultThreshold = 5m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== TOOL DESIGN =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "TOOL_REVISION_RATE", Name = "Tỷ lệ sửa đổi khuôn", Description = "Cảnh báo khi tỷ lệ sửa đổi khuôn vượt X%", DepartmentCode = "ToolDesign", DefaultThreshold = 15m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "TOOL_DELIVERY_DELAY", Name = "Giao khuôn trễ", Description = "Cảnh báo khi tỷ lệ giao khuôn đúng hạn dưới X%", DepartmentCode = "ToolDesign", DefaultThreshold = 90m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "TOOL_COST_OVERRUN", Name = "Chi phí khuôn vượt dự toán", Description = "Cảnh báo khi chi phí khuôn vượt dự toán X%", DepartmentCode = "ToolDesign", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== MARKETING =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "MKT_CAMPAIGN_ROI", Name = "ROI chiến dịch thấp", Description = "Cảnh báo khi ROI chiến dịch marketing dưới X%", DepartmentCode = "Marketing", DefaultThreshold = 20m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "MKT_LEAD_CONVERSION", Name = "Tỷ lệ chuyển đổi lead thấp", Description = "Cảnh báo khi tỷ lệ chuyển đổi lead dưới X%", DepartmentCode = "Marketing", DefaultThreshold = 5m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "MKT_WEBSITE_TRAFFIC", Name = "Lượng truy cập website giảm", Description = "Cảnh báo khi lượng truy cập website giảm X% so với kỳ trước", DepartmentCode = "Marketing", DefaultThreshold = 20m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "MKT_SOCIAL_ENGAGEMENT", Name = "Tương tác mạng xã hội thấp", Description = "Cảnh báo khi tỷ lệ tương tác trên mạng xã hội dưới X%", DepartmentCode = "Marketing", DefaultThreshold = 3m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== QUALITY ASSURANCE =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "QA_DEFECT_RATE", Name = "Tỷ lệ lỗi cao", Description = "Cảnh báo khi tỷ lệ sản phẩm lỗi vượt X%", DepartmentCode = "QualityAssurance", DefaultThreshold = 3m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "QA_INSPECTION_FAIL", Name = "Kiểm tra chất lượng thất bại", Description = "Cảnh báo khi tỷ lệ kiểm tra không đạt vượt X%", DepartmentCode = "QualityAssurance", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "QA_RETURN_RATE", Name = "Tỷ lệ trả hàng cao", Description = "Cảnh báo khi tỷ lệ trả hàng vượt X%", DepartmentCode = "QualityAssurance", DefaultThreshold = 5m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "QA_CUSTOMER_COMPLAINT", Name = "Khiếu nại khách hàng tăng", Description = "Cảnh báo khi số khiếu nại khách hàng tăng X% so với kỳ trước", DepartmentCode = "QualityAssurance", DefaultThreshold = 20m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== DOCUMENT CONTROL =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "DOC_PENDING_APPROVAL", Name = "Tài liệu chờ phê duyệt", Description = "Cảnh báo khi số tài liệu chờ phê duyệt vượt X", DepartmentCode = "DocumentControl", DefaultThreshold = 10m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "DOC_EXPIRING", Name = "Tài liệu sắp hết hạn", Description = "Cảnh báo khi số tài liệu sắp hết hạn (30 ngày) vượt X", DepartmentCode = "DocumentControl", DefaultThreshold = 5m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "DOC_REVISION_PENDING", Name = "Bản sửa đổi chờ xử lý", Description = "Cảnh báo khi số tài liệu cần sửa đổi vượt X", DepartmentCode = "DocumentControl", DefaultThreshold = 8m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== FACILITIES =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "FAC_WORKORDER_BACKLOG", Name = "Lệnh sửa chữa tồn đọng", Description = "Cảnh báo khi số lệnh sửa chữa chưa xử lý vượt X", DepartmentCode = "Facilities", DefaultThreshold = 20m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "FAC_EQUIPMENT_FAILURE", Name = "Thiết bị hỏng hóc", Description = "Cảnh báo khi số lần thiết bị hỏng hóc trong kỳ vượt X", DepartmentCode = "Facilities", DefaultThreshold = 5m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "FAC_UTILITY_COST", Name = "Chi phí tiện ích tăng", Description = "Cảnh báo khi chi phí tiện ích tăng X% so với kỳ trước", DepartmentCode = "Facilities", DefaultThreshold = 15m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "FAC_SAFETY_INCIDENT", Name = "Sự cố an toàn", Description = "Cảnh báo khi có sự cố an toàn lao động", DepartmentCode = "Facilities", DefaultThreshold = 1m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== INFORMATION SERVICES =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "IS_SYSTEM_DOWN", Name = "Hệ thống ngừng hoạt động", Description = "Cảnh báo khi thời gian ngừng hệ thống trong tháng vượt X giờ", DepartmentCode = "InformationServices", DefaultThreshold = 4m, ThresholdUnit = "Hours", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "IS_TICKET_BACKLOG", Name = "Ticket hỗ trợ tồn đọng", Description = "Cảnh báo khi số ticket chưa xử lý vượt X", DepartmentCode = "InformationServices", DefaultThreshold = 30m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "IS_SECURITY_ALERT", Name = "Cảnh báo bảo mật", Description = "Cảnh báo khi phát hiện X sự cố bảo mật trong kỳ", DepartmentCode = "InformationServices", DefaultThreshold = 1m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "IS_BACKUP_FAILURE", Name = "Sao lưu thất bại", Description = "Cảnh báo khi sao lưu dữ liệu thất bại", DepartmentCode = "InformationServices", DefaultThreshold = 1m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== SHIPPING AND RECEIVING =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "SHIP_DELAY_RATE", Name = "Tỷ lệ giao hàng trễ", Description = "Cảnh báo khi tỷ lệ giao hàng trễ vượt X%", DepartmentCode = "ShippingAndReceiving", DefaultThreshold = 10m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SHIP_RETURN_RATE", Name = "Tỷ lệ trả hàng cao", Description = "Cảnh báo khi tỷ lệ trả hàng vượt X%", DepartmentCode = "ShippingAndReceiving", DefaultThreshold = 5m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SHIP_RECEIVING_BACKLOG", Name = "Nhận hàng tồn đọng", Description = "Cảnh báo khi số lô hàng chưa nhận kho vượt X", DepartmentCode = "ShippingAndReceiving", DefaultThreshold = 15m, ThresholdUnit = "Count", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "SHIP_DAMAGE_RATE", Name = "Hàng hóa hư hỏng", Description = "Cảnh báo khi tỷ lệ hàng hóa hư hỏng vượt X%", DepartmentCode = "ShippingAndReceiving", DefaultThreshold = 2m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        // ===== EXECUTIVE =====
        alertDefinitions.AddRange(new[]
        {
            new AlertDefinition { Code = "EXEC_REVENUE_BELOW_TARGET", Name = "Doanh thu dưới mục tiêu", Description = "Cảnh báo khi doanh thu thực tế dưới X% mục tiêu", DepartmentCode = "Executive", DefaultThreshold = 90m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "EXEC_MARGIN_DECLINE", Name = "Biên lợi nhuận giảm", Description = "Cảnh báo khi biên lợi nhuận giảm X% so với kỳ trước", DepartmentCode = "Executive", DefaultThreshold = 5m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "EXEC_INVENTORY_TURNS", Name = "Vòng quay tồn kho thấp", Description = "Cảnh báo khi vòng quay tồn kho dưới X lần/năm", DepartmentCode = "Executive", DefaultThreshold = 4m, ThresholdUnit = "Times", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "EXEC_EMPLOYEE_SATISFACTION", Name = "Mức độ hài lòng nhân viên thấp", Description = "Cảnh báo khi điểm hài lòng nhân viên dưới X%", DepartmentCode = "Executive", DefaultThreshold = 60m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
            new AlertDefinition { Code = "EXEC_CUSTOMER_SATISFACTION", Name = "Mức độ hài lòng khách hàng thấp", Description = "Cảnh báo khi điểm hài lòng khách hàng dưới X%", DepartmentCode = "Executive", DefaultThreshold = 75m, ThresholdUnit = "Percent", RequiresParameters = true, IsActive = true, CreatedAt = DateTime.UtcNow },
        });

        _context.AlertDefinitions.AddRange(alertDefinitions);
        await _context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} alert definitions for {DeptCount} departments.", alertDefinitions.Count, 15);
    }

    private async Task SeedVendorDebtsAsync()
    {
        var initializer = new VendorDebtInitializer(
            _serviceProvider.GetRequiredService<ILogger<VendorDebtInitializer>>());
        await initializer.InitializeAsync(_context);
    }
}
