using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Infrastructure.Data;

public class VendorDebtInitializer
{
    private readonly ILogger<VendorDebtInitializer> _logger;

    private static readonly string[] VendorEmails =
    [
        "yuryi.ltd.study@gmail.com",
        "yuryi.ltd.word@gmail.com"
    ];

    public VendorDebtInitializer(ILogger<VendorDebtInitializer> logger)
    {
        _logger = logger;
    }

    public async Task InitializeAsync(ApplicationDbContext2 context)
    {
        if (await context.VendorDebts.AnyAsync())
        {
            _logger.LogInformation("VendorDebts already seeded.");
            return;
        }

        _logger.LogInformation("Seeding vendor debts and importance categories...");

        await SeedVendorImportancesAsync(context);
        await SeedVendorDebtsAsync(context);

        _logger.LogInformation("Seeded vendor debts and importance categories successfully.");
    }

    private async Task SeedVendorImportancesAsync(ApplicationDbContext2 context)
    {
        var categories = new List<VendorImportance>
        {
            new() { VendorCategory = "Core Material",       Score = 95, Reason = "Nhà cung cấp nguyên liệu lõi, không có không sản xuất được" },
            new() { VendorCategory = "Core Material",       Score = 90, Reason = "Nhà cung cấp nguyên liệu lõi, ảnh hưởng trực tiếp sản xuất" },
            new() { VendorCategory = "Equipment",           Score = 80, Reason = "Nhà cung cấp thiết bị sản xuất chính" },
            new() { VendorCategory = "Equipment",          Score = 75, Reason = "Nhà cung cấp linh kiện máy móc quan trọng" },
            new() { VendorCategory = "Equipment",          Score = 70, Reason = "Nhà cung cấp phụ tùng thiết bị" },
            new() { VendorCategory = "Logistics",           Score = 65, Reason = "Nhà cung cấp logistics, ảnh hưởng giao hàng" },
            new() { VendorCategory = "Logistics",           Score = 60, Reason = "Nhà cung cấp vận chuyển, ảnh hưởng chuỗi cung ứng" },
            new() { VendorCategory = "Logistics",           Score = 55, Reason = "Nhà cung cấp kho bãi và logistics" },
            new() { VendorCategory = "Service",             Score = 45, Reason = "Nhà cung cấp dịch vụ bảo trì định kỳ" },
            new() { VendorCategory = "Service",             Score = 40, Reason = "Nhà cung cấp dịch vụ hỗ trợ vận hành" },
            new() { VendorCategory = "Service",             Score = 35, Reason = "Nhà cung cấp dịch vụ tư vấn" },
            new() { VendorCategory = "Office Supply",       Score = 25, Reason = "Nhà cung cấp văn phòng phẩm, ảnh hưởng thấp" },
            new() { VendorCategory = "Office Supply",       Score = 20, Reason = "Nhà cung cấp văn phòng phẩm không thiết yếu" },
            new() { VendorCategory = "Office Supply",       Score = 10, Reason = "Nhà cung cấp văn phòng phẩm, có thể hoãn" },
        };

        context.VendorImportances.AddRange(categories);
        await context.SaveChangesAsync();
        _logger.LogInformation("Seeded {Count} vendor importance categories.", categories.Count);
    }

    private async Task SeedVendorDebtsAsync(ApplicationDbContext2 context)
    {
        var now = DateTime.UtcNow;
        var index = 0;

        var debts = new List<VendorDebt>
        {
            // === CORE MATERIAL (10 debts, Score 90-100, tổng ~1,300M) ===
            new() { VendorName = "Thép Hòa Phát",          InvoiceNumber = "INV-CM-001",  VendorEmail = VendorEmails[index++ % 2],        Amount = 180_000_000, ImportanceScore = 100, Category = "Core Material",  DueDate = now.AddDays(7),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Nhựa Nguyên Sinh Đại Việt", InvoiceNumber = "INV-CM-002", VendorEmail = VendorEmails[index++ % 2],    Amount = 150_000_000, ImportanceScore = 98,  Category = "Core Material",  DueDate = now.AddDays(5),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Hóa Chất Vũng Tàu",       InvoiceNumber = "INV-CM-003",  VendorEmail = VendorEmails[index++ % 2],           Amount = 120_000_000, ImportanceScore = 97,  Category = "Core Material",  DueDate = now.AddDays(10), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Sợi Tổng Hợp Dệt Nhật",   InvoiceNumber = "INV-CM-004",  VendorEmail = VendorEmails[index++ % 2],    Amount = 110_000_000, ImportanceScore = 96,  Category = "Core Material",  DueDate = now.AddDays(3),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Giấy Carton Bình Dương",  InvoiceNumber = "INV-CM-005",  VendorEmail = VendorEmails[index++ % 2],     Amount = 100_000_000, ImportanceScore = 95,  Category = "Core Material",  DueDate = now.AddDays(14), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Cao Su Thiên Nhiên HN",    InvoiceNumber = "INV-CM-006",  VendorEmail = VendorEmails[index++ % 2],   Amount = 95_000_000,  ImportanceScore = 94,  Category = "Core Material",  DueDate = now.AddDays(8),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Nhựa PVC Bình Thuận",      InvoiceNumber = "INV-CM-007",  VendorEmail = VendorEmails[index++ % 2],        Amount = 90_000_000,  ImportanceScore = 93,  Category = "Core Material",  DueDate = now.AddDays(12), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Bông Vải Không Dệt Miền Nam", InvoiceNumber = "INV-CM-008", VendorEmail = VendorEmails[index++ % 2],       Amount = 85_000_000,  ImportanceScore = 92,  Category = "Core Material",  DueDate = now.AddDays(6),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Phân Bón Hóa Học Đồng Nai", InvoiceNumber = "INV-CM-009",  VendorEmail = VendorEmails[index++ % 2],   Amount = 80_000_000,  ImportanceScore = 91,  Category = "Core Material",  DueDate = now.AddDays(9),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Silicone Cao Cấp Sài Gòn", InvoiceNumber = "INV-CM-010",  VendorEmail = VendorEmails[index++ % 2],            Amount = 75_000_000,  ImportanceScore = 90,  Category = "Core Material",  DueDate = now.AddDays(11), Status = DebtStatus.Pending, CreatedAt = now },

            // === EQUIPMENT (12 debts, Score 70-89, tổng ~600M) ===
            new() { VendorName = "Máy CNC Bạch Mã",          InvoiceNumber = "INV-EQ-001",   VendorEmail = VendorEmails[index++ % 2],        Amount = 75_000_000,  ImportanceScore = 89,  Category = "Equipment",      DueDate = now.AddDays(15), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Robot Công Nghiệp ABB Việt Nam", InvoiceNumber = "INV-EQ-002", VendorEmail = VendorEmails[index++ % 2],          Amount = 70_000_000,  ImportanceScore = 87,  Category = "Equipment",      DueDate = now.AddDays(20), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Băng Tải Công Nghiệp HCM", InvoiceNumber = "INV-EQ-003",   VendorEmail = VendorEmails[index++ % 2],          Amount = 65_000_000,  ImportanceScore = 85,  Category = "Equipment",      DueDate = now.AddDays(18), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Máy Ép Phun Nhựa Toshiba", InvoiceNumber = "INV-EQ-004",   VendorEmail = VendorEmails[index++ % 2],         Amount = 60_000_000,  ImportanceScore = 83,  Category = "Equipment",      DueDate = now.AddDays(22), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Cảm Biến Quang Siemens ĐN", InvoiceNumber = "INV-EQ-005",   VendorEmail = VendorEmails[index++ % 2],           Amount = 55_000_000,  ImportanceScore = 81,  Category = "Equipment",      DueDate = now.AddDays(25), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Động Cơ Servo Panasonic HN", InvoiceNumber = "INV-EQ-006", VendorEmail = VendorEmails[index++ % 2],            Amount = 50_000_000,  ImportanceScore = 79,  Category = "Equipment",      DueDate = now.AddDays(28), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Van Công Nghiệp KVS",       InvoiceNumber = "INV-EQ-007",   VendorEmail = VendorEmails[index++ % 2],          Amount = 45_000_000,  ImportanceScore = 77,  Category = "Equipment",      DueDate = now.AddDays(30), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Máy Hàn Laser Thiên Trường", InvoiceNumber = "INV-EQ-008",  VendorEmail = VendorEmails[index++ % 2],       Amount = 42_000_000,  ImportanceScore = 76,  Category = "Equipment",      DueDate = now.AddDays(16), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Thiết Bị Đo Lường Kyoritsu", InvoiceNumber = "INV-EQ-009",  VendorEmail = VendorEmails[index++ % 2],          Amount = 38_000_000,  ImportanceScore = 74,  Category = "Equipment",      DueDate = now.AddDays(19), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Máy Nén Khí Atlas Copco",   InvoiceNumber = "INV-EQ-010",   VendorEmail = VendorEmails[index++ % 2],       Amount = 35_000_000,  ImportanceScore = 72,  Category = "Equipment",      DueDate = now.AddDays(21), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Bơm Công Nghiệp Grundfos",   InvoiceNumber = "INV-EQ-011",   VendorEmail = VendorEmails[index++ % 2],       Amount = 33_000_000,  ImportanceScore = 71,  Category = "Equipment",      DueDate = now.AddDays(24), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Hệ Thống Sấy Khí compressed", InvoiceNumber = "INV-EQ-012",  VendorEmail = VendorEmails[index++ % 2],     Amount = 30_000_000,  ImportanceScore = 70,  Category = "Equipment",      DueDate = now.AddDays(27), Status = DebtStatus.Pending, CreatedAt = now },

            // === LOGISTICS (10 debts, Score 50-69, tổng ~320M) ===
            new() { VendorName = "Vận Tải Quốc Tế Đông Nam",  InvoiceNumber = "INV-LO-001",  VendorEmail = VendorEmails[index++ % 2], Amount = 50_000_000,  ImportanceScore = 69,  Category = "Logistics",       DueDate = now.AddDays(10), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Kho Bãi Tân Thuận Logis",   InvoiceNumber = "INV-LO-002",  VendorEmail = VendorEmails[index++ % 2],               Amount = 45_000_000,  ImportanceScore = 67,  Category = "Logistics",       DueDate = now.AddDays(13), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Vận Chuyển Nội Địa Miền Bắc", InvoiceNumber = "INV-LO-003", VendorEmail = VendorEmails[index++ % 2],        Amount = 40_000_000,  ImportanceScore = 65,  Category = "Logistics",       DueDate = now.AddDays(8),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Container Shipping Vietnam", InvoiceNumber = "INV-LO-004",  VendorEmail = VendorEmails[index++ % 2],      Amount = 38_000_000,  ImportanceScore = 63,  Category = "Logistics",       DueDate = now.AddDays(17), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Express Delivery VN Express", InvoiceNumber = "INV-LO-005",  VendorEmail = VendorEmails[index++ % 2], Amount = 32_000_000,  ImportanceScore = 61,  Category = "Logistics",       DueDate = now.AddDays(6),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Hải Quan Trọng Điểm",        InvoiceNumber = "INV-LO-006",  VendorEmail = VendorEmails[index++ % 2],            Amount = 28_000_000,  ImportanceScore = 59,  Category = "Logistics",       DueDate = now.AddDays(12), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Giao Nhận Hàng Container",   InvoiceNumber = "INV-LO-007",  VendorEmail = VendorEmails[index++ % 2],  Amount = 25_000_000,  ImportanceScore = 57,  Category = "Logistics",       DueDate = now.AddDays(15), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Bốc Xếp Chuyên Nghiệp",     InvoiceNumber = "INV-LO-008",  VendorEmail = VendorEmails[index++ % 2],       Amount = 22_000_000,  ImportanceScore = 55,  Category = "Logistics",       DueDate = now.AddDays(9),  Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Thuê Xe Tải Nặng Trung Sơn", InvoiceNumber = "INV-LO-009",  VendorEmail = VendorEmails[index++ % 2],  Amount = 20_000_000,  ImportanceScore = 53,  Category = "Logistics",       DueDate = now.AddDays(11), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Cross-dock Miền Trung",      InvoiceNumber = "INV-LO-010",  VendorEmail = VendorEmails[index++ % 2],     Amount = 18_000_000,  ImportanceScore = 50,  Category = "Logistics",       DueDate = now.AddDays(14), Status = DebtStatus.Pending, CreatedAt = now },

            // === SERVICE (10 debts, Score 30-49, tổng ~200M) ===
            new() { VendorName = "Bảo Trì Máy Móc Toàn Phúc", InvoiceNumber = "INV-SV-001",  VendorEmail = VendorEmails[index++ % 2],       Amount = 35_000_000,  ImportanceScore = 49,  Category = "Service",         DueDate = now.AddDays(20), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Tư Vấn Quản Lý Chuẩn Vàng", InvoiceNumber = "INV-SV-002",  VendorEmail = VendorEmails[index++ % 2],   Amount = 30_000_000,  ImportanceScore = 47,  Category = "Service",         DueDate = now.AddDays(25), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "IT Support Máy Chủ Pro",    InvoiceNumber = "INV-SV-003",  VendorEmail = VendorEmails[index++ % 2],            Amount = 25_000_000,  ImportanceScore = 45,  Category = "Service",         DueDate = now.AddDays(18), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Vệ Sinh Công Nghiệp Sạch",  InvoiceNumber = "INV-SV-004",  VendorEmail = VendorEmails[index++ % 2],   Amount = 20_000_000,  ImportanceScore = 43,  Category = "Service",         DueDate = now.AddDays(15), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "An Ninh Bảo Vệ Gia Long",   InvoiceNumber = "INV-SV-005",  VendorEmail = VendorEmails[index++ % 2],     Amount = 18_000_000,  ImportanceScore = 41,  Category = "Service",         DueDate = now.AddDays(12), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Catering Nhân Viên Công Ty", InvoiceNumber = "INV-SV-006",  VendorEmail = VendorEmails[index++ % 2],     Amount = 15_000_000,  ImportanceScore = 39,  Category = "Service",         DueDate = now.AddDays(10), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Thiết Kế Nội Thất Văn Phòng", InvoiceNumber = "INV-SV-007", VendorEmail = VendorEmails[index++ % 2],        Amount = 14_000_000,  ImportanceScore = 37,  Category = "Service",         DueDate = now.AddDays(30), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Phần Mềm ERP SAP Việt Nam", InvoiceNumber = "INV-SV-008",  VendorEmail = VendorEmails[index++ % 2],       Amount = 12_000_000,  ImportanceScore = 35,  Category = "Service",         DueDate = now.AddDays(22), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Đào Tạo Nhân Sự HR Plus",   InvoiceNumber = "INV-SV-009",  VendorEmail = VendorEmails[index++ % 2],   Amount = 10_000_000,  ImportanceScore = 33,  Category = "Service",         DueDate = now.AddDays(28), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Kiểm Toán Độc Lập AASC",   InvoiceNumber = "INV-SV-010",  VendorEmail = VendorEmails[index++ % 2],              Amount = 9_000_000,   ImportanceScore = 31,  Category = "Service",         DueDate = now.AddDays(35), Status = DebtStatus.Pending, CreatedAt = now },

            // === OFFICE SUPPLY (8 debts, Score 1-29, tổng ~50M) ===
            new() { VendorName = "Văn Phòng Phẩm Bình Minh", InvoiceNumber = "INV-OF-001",  VendorEmail = VendorEmails[index++ % 2], Amount = 12_000_000,  ImportanceScore = 28,  Category = "Office Supply",   DueDate = now.AddDays(30), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "In Ấn Danh Thiếp Nhanh",  InvoiceNumber = "INV-OF-002",  VendorEmail = VendorEmails[index++ % 2],           Amount = 8_000_000,   ImportanceScore = 25,  Category = "Office Supply",   DueDate = now.AddDays(25), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Thiết Bị Văn Phòng Phương Đông", InvoiceNumber = "INV-OF-003", VendorEmail = VendorEmails[index++ % 2],    Amount = 7_000_000,   ImportanceScore = 22,  Category = "Office Supply",   DueDate = now.AddDays(20), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Nước Uống Đóng Chai Việt Thanh", InvoiceNumber = "INV-OF-004", VendorEmail = VendorEmails[index++ % 2],  Amount = 6_000_000,   ImportanceScore = 19,  Category = "Office Supply",   DueDate = now.AddDays(15), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Vật Tư In Ấn Sài Gòn",     InvoiceNumber = "INV-OF-005",  VendorEmail = VendorEmails[index++ % 2], Amount = 5_000_000,   ImportanceScore = 16,  Category = "Office Supply",   DueDate = now.AddDays(28), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Ghế Văn Phòng Ergonomic",   InvoiceNumber = "INV-OF-006",  VendorEmail = VendorEmails[index++ % 2],          Amount = 4_500_000,   ImportanceScore = 13,  Category = "Office Supply",   DueDate = now.AddDays(35), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Bình Hoa Trang Trí Công Ty", InvoiceNumber = "INV-OF-007", VendorEmail = VendorEmails[index++ % 2],        Amount = 3_500_000,   ImportanceScore = 10,  Category = "Office Supply",   DueDate = now.AddDays(40), Status = DebtStatus.Pending, CreatedAt = now },
            new() { VendorName = "Đồ Trang Trí Nội Thất Tết", InvoiceNumber = "INV-OF-008", VendorEmail = VendorEmails[index++ % 2],    Amount = 3_000_000,   ImportanceScore = 7,   Category = "Office Supply",   DueDate = now.AddDays(45), Status = DebtStatus.Pending, CreatedAt = now },
        };

        var studyCount = debts.Count(d => d.VendorEmail == "yuryi.ltd.study@gmail.com");
        var wordCount   = debts.Count(d => d.VendorEmail == "yuryi.ltd.word@gmail.com");
        _logger.LogInformation(
            "Created {Count} vendor debts — study={Study} | word={Word}",
            debts.Count, studyCount, wordCount);

        context.VendorDebts.AddRange(debts);
        await context.SaveChangesAsync();
    }
}
