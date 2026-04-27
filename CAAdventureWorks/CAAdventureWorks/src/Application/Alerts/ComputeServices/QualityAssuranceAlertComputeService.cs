using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class QualityAssuranceAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "QualityAssurance";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.WorkOrders
            .MaxAsync(w => (DateTime?)w.StartDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Defect rate - cancelled/rejected orders
        var totalOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow)
            .CountAsync(ct);
        var rejectedOrders = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.ScrapReasonId != null)
            .CountAsync(ct);
        var defectRate = totalOrders > 0 ? ((decimal)rejectedOrders / totalOrders) * 100m : 0m;
        values["DEFECT_RATE"] = defectRate;
        messages["DEFECT_RATE"] = $"Tỷ lệ lỗi: {defectRate:N2}% ({rejectedOrders}/{totalOrders})";

        // Inspection fail - scrap reasons
        var scrapCount = await db.WorkOrders
            .Where(w => w.StartDate >= cutoff && w.StartDate <= effectiveNow && w.ScrapReasonId != null)
            .SumAsync(w => (int?)w.ScrappedQty, ct) ?? 0;
        values["INSPECTION_FAIL"] = scrapCount;
        messages["INSPECTION_FAIL"] = $"Số lượng phế phẩm: {scrapCount:N0} đơn vị";

        // Return rate - cancelled sales orders
        var totalSalesOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow)
            .CountAsync(ct);
        var returnedOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && (o.Status == 4 || o.Status == 6))
            .CountAsync(ct);
        var returnRate = totalSalesOrders > 0 ? ((decimal)returnedOrders / totalSalesOrders) * 100m : 0m;
        values["RETURN_RATE"] = returnRate;
        messages["RETURN_RATE"] = $"Tỷ lệ trả hàng: {returnRate:N1}% ({returnedOrders}/{totalSalesOrders})";

        // Customer complaints - rejected orders
        values["CUSTOMER_COMPLAINT"] = returnedOrders;
        messages["CUSTOMER_COMPLAINT"] = $"Đơn hàng có vấn đề: {returnedOrders}";

        return new DepartmentAlertMetrics("QualityAssurance", values, messages);
    }
}
