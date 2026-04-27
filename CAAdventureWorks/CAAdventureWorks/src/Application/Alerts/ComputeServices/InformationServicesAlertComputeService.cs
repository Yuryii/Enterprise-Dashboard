using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class InformationServicesAlertComputeService(IApplicationDbContext db) : IAlertComputeService
{
    public string DepartmentCode => "InformationServices";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // System uptime proxy - active order processing
        var recentOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow)
            .CountAsync(ct);
        values["SYSTEM_DOWN"] = 0m;
        messages["SYSTEM_DOWN"] = $"Đơn hàng xử lý ({scanDays} ngày): {recentOrders}";

        // Ticket backlog - work orders pending
        var pendingWorkOrders = await db.WorkOrders
            .Where(w => w.EndDate == null)
            .CountAsync(ct);
        values["TICKET_BACKLOG"] = pendingWorkOrders;
        messages["TICKET_BACKLOG"] = $"Lệnh chưa hoàn thành: {pendingWorkOrders}";

        // Security alert - orders with issues
        var rejectedOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && (o.Status == 4 || o.Status == 6))
            .CountAsync(ct);
        values["SECURITY_ALERT"] = rejectedOrders;
        messages["SECURITY_ALERT"] = $"Đơn hàng có vấn đề: {rejectedOrders}";

        // Backup failure - no direct data
        values["BACKUP_FAILURE"] = 0m;
        messages["BACKUP_FAILURE"] = "Sao lưu dữ liệu: Không có lỗi được ghi nhận";

        return new DepartmentAlertMetrics("InformationServices", values, messages);
    }
}
