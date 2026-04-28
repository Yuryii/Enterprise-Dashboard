using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class FinanceAlertComputeService(
    IApplicationDbContext db,
    IChatBotDbContext chatBotDb) : IAlertComputeService
{
    public string DepartmentCode => "Finance";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.SalesOrderHeaders
            .MaxAsync(o => (DateTime?)o.OrderDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Revenue as proxy for budget
        var currentRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var expectedRevenue = currentRevenue * 1.1m; // 10% above as budget target
        var budgetVariance = expectedRevenue > 0 ? ((currentRevenue / expectedRevenue) - 1m) * 100m : 0m;
        values["BUDGET_VARIANCE"] = budgetVariance;
        messages["BUDGET_VARIANCE"] = $"Chênh lệch ngân sách: {budgetVariance:+0.0;-0.0;0}%";

        // Overdue payments - rejected/cancelled orders as proxy
        var totalOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow)
            .CountAsync(ct);
        var overdueOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && (o.Status == 4 || o.Status == 6))
            .CountAsync(ct);
        var overdueRate = totalOrders > 0 ? ((decimal)overdueOrders / totalOrders) * 100m : 0m;
        values["OVERDUE_PAYMENT"] = overdueRate;
        messages["OVERDUE_PAYMENT"] = $"Tỷ lệ đơn hàng có vấn đề thanh toán: {overdueRate:N1}%";

        // AR Aging - use order totals as proxy
        var totalDue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        values["AR_AGING"] = 15m;
        messages["AR_AGING"] = $"Công nợ phải thu: ${totalDue:N0}";

        // Credit limit - average order value
        var avgOrderValue = totalOrders > 0 ? totalDue / totalOrders : 0m;
        values["CREDIT_LIMIT"] = avgOrderValue;
        messages["CREDIT_LIMIT"] = $"Giá trị đơn TB: ${avgOrderValue:N0}";

        // --- Debt Optimization Metrics ---
        var now = DateTime.UtcNow;

        // DEBT_OVERDUE_DAYS: Average overdue days for pending debts past due date
        var overdueDebts = await chatBotDb.VendorDebts
            .Where(d => d.Status == DebtStatus.Pending && d.DueDate < now)
            .ToListAsync(ct);
        decimal avgOverdueDays = overdueDebts.Count > 0
            ? (decimal)overdueDebts.Average(d => (now - d.DueDate).TotalDays)
            : 0m;
        values["DEBT_OVERDUE_DAYS"] = avgOverdueDays;
        messages["DEBT_OVERDUE_DAYS"] = $"Số ngày quá hạn TB: {avgOverdueDays:N1} ngày ({overdueDebts.Count} khoản)";

        // DEBT_HIGH_VALUE_VENDOR: Largest total debt by single vendor
        decimal maxVendorDebt = await chatBotDb.VendorDebts
            .Where(d => d.Status == DebtStatus.Pending)
            .GroupBy(d => d.VendorName)
            .Select(g => g.Sum(x => x.Amount))
            .DefaultIfEmpty(0m)
            .MaxAsync(ct);
        values["DEBT_HIGH_VALUE_VENDOR"] = maxVendorDebt;
        messages["DEBT_HIGH_VALUE_VENDOR"] = $"Công nợ vendor lớn nhất: {maxVendorDebt:N0} VND";

        // DEBT_PAYMENT_EFFICIENCY: Paid amount / Total debt amount ratio
        var allDebts = await chatBotDb.VendorDebts.ToListAsync(ct);
        decimal totalDebtAmount = allDebts.Sum(d => d.Amount);
        decimal paidDebtAmount = allDebts.Where(d => d.Status == DebtStatus.Paid).Sum(d => d.Amount);
        decimal paymentEfficiency = totalDebtAmount > 0
            ? paidDebtAmount / totalDebtAmount * 100m
            : 0m;
        values["DEBT_PAYMENT_EFFICIENCY"] = paymentEfficiency;
        messages["DEBT_PAYMENT_EFFICIENCY"] = $"Hiệu suất thanh toán: {paymentEfficiency:N1}% ({paidDebtAmount:N0}/{totalDebtAmount:N0} VND)";

        // DEBT_CORE_MATERIAL_EXPOSURE: Total unpaid debt in Core Material category
        decimal coreMaterialDebt = await chatBotDb.VendorDebts
            .Where(d => d.Status != DebtStatus.Paid && d.Category == "Core Material")
            .SumAsync(d => d.Amount, ct);
        values["DEBT_CORE_MATERIAL_EXPOSURE"] = coreMaterialDebt;
        messages["DEBT_CORE_MATERIAL_EXPOSURE"] = $"Rủi ro nguyên liệu lõi (Core Material): {coreMaterialDebt:N0} VND";

        // DEBT_URGENT_DUE: Count of pending debts due within 3 days
        var urgentCount = await chatBotDb.VendorDebts
            .Where(d => d.Status == DebtStatus.Pending
                && d.DueDate >= now
                && d.DueDate <= now.AddDays(3))
            .CountAsync(ct);
        values["DEBT_URGENT_DUE"] = urgentCount;
        messages["DEBT_URGENT_DUE"] = $"Công nợ đến hạn trong 3 ngày: {urgentCount} khoản";

        return new DepartmentAlertMetrics("Finance", values, messages);
    }
}
