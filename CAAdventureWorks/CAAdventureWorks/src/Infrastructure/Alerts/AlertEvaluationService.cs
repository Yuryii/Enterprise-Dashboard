using CAAdventureWorks.Application.Alerts.ComputeServices;
using CAAdventureWorks.Application.Alerts.Interfaces;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Infrastructure.Alerts;

public class AlertEvaluationService : IAlertEvaluationService
{
    private readonly IApplicationDbContext _mainDb;
    private readonly IChatBotDbContext _alertDb;
    private readonly IEnumerable<IAlertComputeService> _computeServices;

    private static readonly Dictionary<string, (string DeptCode, string MetricKey, Func<decimal, decimal, bool> TriggerCondition)> AlertMetricMap = new()
    {
        // Sales
        ["SALES_REVENUE_DECLINE"] = ("Sales", "REVENUE_CHANGE", (actual, threshold) => actual < -threshold),
        ["SALES_ORDER_COUNT_DECLINE"] = ("Sales", "ORDER_COUNT_CHANGE", (actual, threshold) => actual < -threshold),
        ["SALES_TOP_PRODUCT_CHANGE"] = ("Sales", "TOP_PRODUCT_CHANGE", (actual, _) => actual > 0),
        ["SALES_ORDER_STATUS_ISSUE"] = ("Sales", "ORDER_STATUS_ISSUE", (actual, threshold) => actual > threshold),
        ["SALES_CUSTOMER_CONCENTRATION"] = ("Sales", "CUSTOMER_CONCENTRATION", (actual, threshold) => actual > threshold),
        // Production
        ["PRODUCTION_SCRAP_RATE"] = ("Production", "SCRAP_RATE", (actual, threshold) => actual > threshold),
        ["PRODUCTION_WORKORDER_DELAY"] = ("Production", "WORKORDER_DELAY", (actual, threshold) => actual > threshold),
        ["PRODUCTION_MACHINE_DOWNTIME"] = ("Production", "MACHINE_DOWNTIME", (actual, threshold) => actual > threshold),
        ["PRODUCTION_INVENTORY_LOW"] = ("Production", "INVENTORY_LOW", (actual, threshold) => actual < threshold),
        // Purchasing
        ["PURCHASING_PO_DELAY"] = ("Purchasing", "PO_DELAY", (actual, threshold) => actual > threshold),
        ["PURCHASING_VENDOR_PERF"] = ("Purchasing", "VENDOR_PERF", (actual, threshold) => actual < threshold),
        ["PURCHASING_STOCKOUT"] = ("Purchasing", "STOCKOUT", (actual, threshold) => actual > threshold),
        ["PURCHASING_PRICE_VARIANCE"] = ("Purchasing", "PRICE_VARIANCE", (actual, threshold) => true),
        // Human Resources
        ["HR_OPEN_POSITIONS"] = ("HumanResources", "OPEN_POSITIONS", (actual, threshold) => actual > threshold),
        ["HR_TURNOVER_RATE"] = ("HumanResources", "ACTIVE_EMPLOYEES", (actual, threshold) => true),
        ["HR_OVERTIME_HIGH"] = ("HumanResources", "OVERTIME_HIGH", (actual, threshold) => actual > threshold),
        ["HR_SICK_LEAVE_HIGH"] = ("HumanResources", "SICK_LEAVE_HIGH", (actual, threshold) => actual > threshold),
        // Finance
        ["FINANCE_BUDGET_VARIANCE"] = ("Finance", "BUDGET_VARIANCE", (actual, threshold) => Math.Abs(actual) > threshold),
        ["FINANCE_OVERDUE_PAYMENT"] = ("Finance", "OVERDUE_PAYMENT", (actual, threshold) => actual > threshold),
        ["FINANCE_AR_AGING"] = ("Finance", "AR_AGING", (actual, threshold) => actual > threshold),
        ["FINANCE_CREDIT_LIMIT"] = ("Finance", "CREDIT_LIMIT", (actual, threshold) => true),
        // Engineering
        ["ENG_PROJECT_DELAY"] = ("Engineering", "PROJECT_DELAY", (actual, threshold) => actual > threshold),
        ["ENG_CHANGE_ORDER_RATE"] = ("Engineering", "CHANGE_ORDER_RATE", (actual, threshold) => actual > threshold),
        ["ENG_DOCUMENT_REVISION"] = ("Engineering", "DOCUMENT_REVISION", (actual, threshold) => actual > threshold),
        // Marketing
        ["MKT_CAMPAIGN_ROI"] = ("Marketing", "CAMPAIGN_ROI", (actual, threshold) => true),
        ["MKT_LEAD_CONVERSION"] = ("Marketing", "LEAD_CONVERSION", (actual, threshold) => actual < threshold),
        ["MKT_WEBSITE_TRAFFIC"] = ("Marketing", "WEBSITE_TRAFFIC", (actual, threshold) => true),
        ["MKT_SOCIAL_ENGAGEMENT"] = ("Marketing", "SOCIAL_ENGAGEMENT", (actual, threshold) => true),
        // Quality Assurance
        ["QA_DEFECT_RATE"] = ("QualityAssurance", "DEFECT_RATE", (actual, threshold) => actual > threshold),
        ["QA_INSPECTION_FAIL"] = ("QualityAssurance", "INSPECTION_FAIL", (actual, threshold) => actual > threshold),
        ["QA_RETURN_RATE"] = ("QualityAssurance", "RETURN_RATE", (actual, threshold) => actual > threshold),
        ["QA_CUSTOMER_COMPLAINT"] = ("QualityAssurance", "CUSTOMER_COMPLAINT", (actual, threshold) => actual > threshold),
        // Document Control
        ["DOC_PENDING_APPROVAL"] = ("DocumentControl", "PENDING_APPROVAL", (actual, threshold) => actual > threshold),
        ["DOC_EXPIRING"] = ("DocumentControl", "EXPIRING", (actual, threshold) => actual > threshold),
        ["DOC_REVISION_PENDING"] = ("DocumentControl", "REVISION_PENDING", (actual, threshold) => actual > threshold),
        // Facilities
        ["FAC_WORKORDER_BACKLOG"] = ("Facilities", "WORKORDER_BACKLOG", (actual, threshold) => actual > threshold),
        ["FAC_EQUIPMENT_FAILURE"] = ("Facilities", "EQUIPMENT_FAILURE", (actual, threshold) => actual > threshold),
        ["FAC_UTILITY_COST"] = ("Facilities", "UTILITY_COST", (actual, threshold) => true),
        ["FAC_SAFETY_INCIDENT"] = ("Facilities", "SAFETY_INCIDENT", (actual, threshold) => actual > 0),
        // Information Services
        ["IS_SYSTEM_DOWN"] = ("InformationServices", "SYSTEM_DOWN", (actual, threshold) => true),
        ["IS_TICKET_BACKLOG"] = ("InformationServices", "TICKET_BACKLOG", (actual, threshold) => actual > threshold),
        ["IS_SECURITY_ALERT"] = ("InformationServices", "SECURITY_ALERT", (actual, threshold) => actual > threshold),
        ["IS_BACKUP_FAILURE"] = ("InformationServices", "BACKUP_FAILURE", (actual, threshold) => actual > 0),
        // Shipping and Receiving
        ["SHIP_DELAY_RATE"] = ("ShippingAndReceiving", "SHIP_DELAY_RATE", (actual, threshold) => actual > threshold),
        ["SHIP_RETURN_RATE"] = ("ShippingAndReceiving", "RETURN_RATE", (actual, threshold) => actual > threshold),
        ["SHIP_RECEIVING_BACKLOG"] = ("ShippingAndReceiving", "RECEIVING_BACKLOG", (actual, threshold) => actual > threshold),
        ["SHIP_DAMAGE_RATE"] = ("ShippingAndReceiving", "DAMAGE_RATE", (actual, threshold) => actual > threshold),
        // Production Control
        ["PRODCTRL_SCHEDULE_ADHERENCE"] = ("ProductionControl", "SCHEDULE_ADHERENCE", (actual, threshold) => actual < threshold),
        ["PRODCTRL_WIP_HIGH"] = ("ProductionControl", "WIP_HIGH", (actual, threshold) => actual > threshold),
        ["PRODCTRL_CYCLE_TIME"] = ("ProductionControl", "CYCLE_TIME", (actual, threshold) => actual > threshold),
        // Tool Design
        ["TOOL_REVISION_RATE"] = ("ToolDesign", "REVISION_RATE", (actual, threshold) => actual > threshold),
        ["TOOL_DELIVERY_DELAY"] = ("ToolDesign", "DELIVERY_DELAY", (actual, threshold) => actual < threshold),
        ["TOOL_COST_OVERRUN"] = ("ToolDesign", "COST_OVERRUN", (actual, threshold) => true),
        // Executive
        ["EXEC_REVENUE_BELOW_TARGET"] = ("Executive", "REVENUE_BELOW_TARGET", (actual, threshold) => actual < threshold),
        ["EXEC_MARGIN_DECLINE"] = ("Executive", "MARGIN_DECLINE", (actual, threshold) => actual < -threshold),
        ["EXEC_INVENTORY_TURNS"] = ("Executive", "INVENTORY_TURNS", (actual, threshold) => actual < threshold),
        ["EXEC_EMPLOYEE_SATISFACTION"] = ("Executive", "EMPLOYEE_SATISFACTION", (actual, threshold) => actual < threshold),
        ["EXEC_CUSTOMER_SATISFACTION"] = ("Executive", "CUSTOMER_SATISFACTION", (actual, threshold) => actual < threshold),
        // Executive - Debt Optimization
        ["EXEC_DEBT_DEFERRED_AMOUNT"] = ("Executive", "DEBT_DEFERRED_AMOUNT", (actual, threshold) => actual > threshold),
        ["EXEC_DEBT_DEFERRED_COUNT"] = ("Executive", "DEBT_DEFERRED_COUNT", (actual, threshold) => actual > threshold),
        ["EXEC_DEBT_BUDGET_UTILIZATION_LOW"] = ("Executive", "DEBT_BUDGET_UTILIZATION", (actual, threshold) => actual < threshold),
        ["EXEC_DEBT_IMPORTANCE_SCORE_LOW"] = ("Executive", "DEBT_IMPORTANCE_SCORE", (actual, threshold) => actual < threshold),
        ["EXEC_DEBT_DEFERRED_CATEGORY_HIGH"] = ("Executive", "DEBT_DEFERRED_CATEGORY_RATIO", (actual, threshold) => actual > threshold),
        // Finance - Debt Optimization
        ["FINANCE_DEBT_OVERDUE_DAYS"] = ("Finance", "DEBT_OVERDUE_DAYS", (actual, threshold) => actual > threshold),
        ["FINANCE_DEBT_HIGH_VALUE_VENDOR"] = ("Finance", "DEBT_HIGH_VALUE_VENDOR", (actual, threshold) => actual > threshold),
        ["FINANCE_DEBT_PAYMENT_EFFICIENCY"] = ("Finance", "DEBT_PAYMENT_EFFICIENCY", (actual, threshold) => actual < threshold),
        ["FINANCE_DEBT_CORE_MATERIAL_EXPOSURE"] = ("Finance", "DEBT_CORE_MATERIAL_EXPOSURE", (actual, threshold) => actual > threshold),
        ["FINANCE_DEBT_URGENT_DUE"] = ("Finance", "DEBT_URGENT_DUE", (actual, threshold) => actual > threshold),
    };

    public AlertEvaluationService(
        IApplicationDbContext mainDb,
        IChatBotDbContext alertDb,
        IEnumerable<IAlertComputeService> computeServices)
    {
        _mainDb = mainDb;
        _alertDb = alertDb;
        _computeServices = computeServices;
    }

    public async Task<AlertEvaluationResult> EvaluateAsync(AlertConfiguration config, CancellationToken ct = default)
    {
        var definition = config.AlertDefinition;
        if (definition == null)
        {
            return new AlertEvaluationResult(false, 0, "Định nghĩa cảnh báo chưa được tải.");
        }

        if (!AlertMetricMap.TryGetValue(definition.Code, out var mapping))
        {
            return new AlertEvaluationResult(false, 0, $"Mã cảnh báo không xác định: {definition.Code}");
        }

        var computeService = _computeServices.FirstOrDefault(s => s.DepartmentCode == mapping.DeptCode);
        if (computeService == null)
        {
            return new AlertEvaluationResult(false, 0, $"Không tìm thấy compute service cho department: {mapping.DeptCode}");
        }

        var metrics = await computeService.ComputeAsync(config.ScanIntervalDays, ct);

        if (!metrics.MetricValues.TryGetValue(mapping.MetricKey, out var actualValue))
        {
            return new AlertEvaluationResult(false, 0, $"Không tìm thấy metric: {mapping.MetricKey}");
        }

        var threshold = config.ThresholdValue ?? definition.DefaultThreshold ?? 0m;
        var message = metrics.MetricMessages.GetValueOrDefault(mapping.MetricKey, $"Giá trị: {actualValue:N2}");
        var isTriggered = mapping.TriggerCondition(actualValue, threshold);

        return new AlertEvaluationResult(isTriggered, actualValue, message);
    }
}
