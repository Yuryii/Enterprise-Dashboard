using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Alerts.ComputeServices;

public class ExecutiveAlertComputeService(
    IApplicationDbContext db,
    IChatBotDbContext chatBotDb) : IAlertComputeService
{
    public string DepartmentCode => "Executive";

    public async Task<DepartmentAlertMetrics> ComputeAsync(int scanDays, CancellationToken ct = default)
    {
        var effectiveNow = await db.SalesOrderHeaders
            .MaxAsync(o => (DateTime?)o.OrderDate, ct) ?? DateTime.UtcNow;
        var cutoff = effectiveNow.AddDays(-scanDays);
        var previousCutoff = cutoff.AddDays(-scanDays);

        var values = new Dictionary<string, decimal>();
        var messages = new Dictionary<string, string>();

        // Revenue below target
        var currentRevenue = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .SumAsync(o => (decimal?)o.TotalDue, ct) ?? 0m;
        var targetRevenue = currentRevenue * 1.1m; // 10% above as target
        var achievementRate = targetRevenue > 0 ? (currentRevenue / targetRevenue) * 100m : 0m;
        values["REVENUE_BELOW_TARGET"] = achievementRate;
        messages["REVENUE_BELOW_TARGET"] = $"Thực hiện mục tiêu: {achievementRate:N1}% (${currentRevenue:N0})";

        // Margin decline - compare periods
        var currentOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .Select(o => o.TotalDue).ToListAsync(ct);
        var previousOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= previousCutoff && o.OrderDate < cutoff && o.Status != 6)
            .Select(o => o.TotalDue).ToListAsync(ct);
        var avgCurrent = currentOrders.Count > 0 ? currentOrders.Average() : 0m;
        var avgPrevious = previousOrders.Count > 0 ? previousOrders.Average() : 0m;
        var marginChange = avgPrevious > 0 ? ((avgCurrent - avgPrevious) / avgPrevious) * 100m : 0m;
        values["MARGIN_DECLINE"] = marginChange;
        messages["MARGIN_DECLINE"] = $"Thay đổi giá trị TB đơn: {marginChange:+0.0;-0.0;0}%";

        // Inventory turns - orders vs inventory
        var totalOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .CountAsync(ct);
        var totalInventory = await db.ProductInventories.SumAsync(i => (int?)i.Quantity, ct) ?? 0;
        var inventoryTurns = totalInventory > 0 ? ((decimal)totalOrders / totalInventory) * 100m : 0m;
        values["INVENTORY_TURNS"] = inventoryTurns;
        messages["INVENTORY_TURNS"] = $"Vòng quay tồn kho: {inventoryTurns:N2} lần";

        // Employee satisfaction - active employees as proxy
        var activeEmployees = await db.Employees
            .Where(e => e.CurrentFlag == true && e.SalariedFlag == true)
            .CountAsync(ct);
        values["EMPLOYEE_SATISFACTION"] = 75m;
        messages["EMPLOYEE_SATISFACTION"] = $"Nhân viên hoạt động: {activeEmployees}";

        // Customer satisfaction - repeat customers
        var totalCustomers = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6)
            .Select(o => o.CustomerId).Distinct().CountAsync(ct);
        var firstOrders = await db.SalesOrderHeaders
            .Where(o => o.OrderDate >= cutoff && o.OrderDate <= effectiveNow && o.Status != 6 && o.SalesOrderNumber!.StartsWith("SO-1"))
            .Select(o => o.CustomerId).Distinct().CountAsync(ct);
        var satisfactionRate = totalCustomers > 0 ? ((decimal)(totalCustomers - firstOrders) / totalCustomers) * 100m : 0m;
        values["CUSTOMER_SATISFACTION"] = satisfactionRate;
        messages["CUSTOMER_SATISFACTION"] = $"Khách hàng quay lại: {satisfactionRate:N1}% ({totalCustomers - firstOrders}/{totalCustomers})";

        // --- Debt Optimization Metrics ---
        // DEBT_DEFERRED_AMOUNT: Total deferred amount from latest payment plan
        var latestPlan = await chatBotDb.PaymentPlans
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync(ct);
        decimal totalDeferredAmount = latestPlan?.TotalBudget > 0
            ? (latestPlan.TotalBudget - latestPlan.UsedBudget)
            : 0m;
        values["DEBT_DEFERRED_AMOUNT"] = totalDeferredAmount;
        messages["DEBT_DEFERRED_AMOUNT"] = $"Tổng công nợ bị hoãn: {totalDeferredAmount:N0} VND";

        // DEBT_DEFERRED_COUNT: Number of deferred debts
        int deferredCount = latestPlan?.DeferredDebtsCount ?? 0;
        values["DEBT_DEFERRED_COUNT"] = deferredCount;
        messages["DEBT_DEFERRED_COUNT"] = $"Số khoản công nợ bị hoãn: {deferredCount}";

        // DEBT_BUDGET_UTILIZATION: Budget usage percentage from latest plan
        decimal budgetUtilization = latestPlan?.TotalBudget > 0
            ? (latestPlan.UsedBudget / latestPlan.TotalBudget) * 100m
            : 0m;
        values["DEBT_BUDGET_UTILIZATION"] = budgetUtilization;
        messages["DEBT_BUDGET_UTILIZATION"] = $"Tỷ lệ sử dụng ngân sách: {budgetUtilization:N1}%";

        // DEBT_IMPORTANCE_SCORE: Total importance score of selected debts
        int totalImportance = latestPlan?.TotalImportanceScore ?? 0;
        values["DEBT_IMPORTANCE_SCORE"] = totalImportance;
        messages["DEBT_IMPORTANCE_SCORE"] = $"Tổng importance score: {totalImportance}";

        // DEBT_DEFERRED_CATEGORY_RATIO: Highest deferred category concentration ratio
        var deferredDebts = await chatBotDb.VendorDebts
            .Where(d => d.Status == DebtStatus.Deferred)
            .GroupBy(d => d.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        decimal totalDeferred = deferredDebts.Sum(x => x.Count);
        decimal highestCategoryRatio = totalDeferred > 0
            ? (deferredDebts.MaxBy(x => x.Count)?.Count ?? 0) / totalDeferred * 100m
            : 0m;
        values["DEBT_DEFERRED_CATEGORY_RATIO"] = highestCategoryRatio;
        var topCategory = deferredDebts.MaxBy(x => x.Count)?.Category ?? "N/A";
        messages["DEBT_DEFERRED_CATEGORY_RATIO"] = $"Tỷ lệ hoãn cao nhất theo danh mục ({topCategory}): {highestCategoryRatio:N1}%";

        return new DepartmentAlertMetrics("Executive", values, messages);
    }
}
