using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class DocumentControlAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "DocumentControl";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Pending approval - products with recent price history (needs approval)
        var pendingApprovals = await db.ProductListPriceHistories
            .Where(h => h.StartDate >= cutoff && h.StartDate <= effectiveNow)
            .CountAsync(ct);
        values["PENDING_APPROVAL"] = pendingApprovals;
        messages["PENDING_APPROVAL"] = $"Tài liệu/bảng giá chờ phê duyệt: {pendingApprovals}";

        // Expiring documents - products modified recently
        var recentlyModified = await db.Products
            .Where(p => p.ModifiedDate >= cutoff && p.ModifiedDate <= effectiveNow)
            .CountAsync(ct);
        values["EXPIRING"] = recentlyModified;
        messages["EXPIRING"] = $"Tài liệu cần cập nhật: {recentlyModified}";

        // Revision pending - product categories with changes
        var categoryChanges = await db.ProductCategories
            .Where(c => c.ModifiedDate >= cutoff && c.ModifiedDate <= effectiveNow)
            .CountAsync(ct);
        values["REVISION_PENDING"] = categoryChanges;
        messages["REVISION_PENDING"] = $"Thay đổi danh mục cần xử lý: {categoryChanges}";

        return new DepartmentAlertMetrics("DocumentControl", values, messages);
    }
}
