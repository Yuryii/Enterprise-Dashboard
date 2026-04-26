namespace CAAdventureWorks.Application.Alerts;

public record AlertDefinitionDto(
    int Id,
    string Code,
    string Name,
    string Description,
    string DepartmentCode,
    decimal? DefaultThreshold,
    string ThresholdUnit,
    bool RequiresParameters
);

public record AlertConfigurationDto(
    int Id,
    int AlertDefinitionId,
    string UserId,
    string DepartmentCode,
    bool IsEnabled,
    decimal? ThresholdValue,
    int ScanIntervalDays,
    int? ScanIntervalSeconds,
    string? ExtraParameters,
    DateTime? LastTriggeredAt,
    DateTime CreatedAt,
    AlertDefinitionDto? AlertDefinition
);

public record AlertHistoryDto(
    int Id,
    int AlertConfigurationId,
    int AlertDefinitionId,
    string AlertName,
    string AlertCode,
    DateTime TriggeredAt,
    decimal ThresholdValue,
    decimal ActualValue,
    string Message,
    bool IsRead,
    bool IsDismissed
);

public record AlertHistoryListDto(
    IEnumerable<AlertHistoryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);

public record CreateAlertConfigurationDto(
    int AlertDefinitionId,
    decimal? ThresholdValue,
    int ScanIntervalDays,
    int? ScanIntervalSeconds,
    string? ExtraParameters
);

public record UpdateAlertConfigurationDto(
    int Id,
    bool IsEnabled,
    decimal? ThresholdValue,
    int ScanIntervalDays,
    int? ScanIntervalSeconds,
    string? ExtraParameters
);
