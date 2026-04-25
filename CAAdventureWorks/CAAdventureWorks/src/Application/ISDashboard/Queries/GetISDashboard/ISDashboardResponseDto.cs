namespace CAAdventureWorks.Application.ISDashboard.Queries.GetISDashboard;

public sealed class ISDashboardResponseDto
{
    public ISDashboardAppliedFilterDto Filters { get; init; } = new();

    public ISOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<ISErrorTrendDto> ErrorTrend { get; init; } = [];

    public IReadOnlyList<ISTopErrorDto> TopErrors { get; init; } = [];

    public IReadOnlyList<ISUserErrorDto> UsersWithMostErrors { get; init; } = [];

    public IReadOnlyList<ISDatabaseActivityDto> DatabaseActivity { get; init; } = [];

    public IReadOnlyList<ISEventTypeDto> EventTypeDistribution { get; init; } = [];

    public IReadOnlyList<ISUserAccountDto> UserAccountsByDepartment { get; init; } = [];

    public IReadOnlyList<ISPasswordAgeDto> PasswordAgeDistribution { get; init; } = [];

    public ISDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class ISDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public short? DepartmentId { get; init; }

    public int? ErrorNumber { get; init; }
}

public sealed class ISOverviewDto
{
    public int TotalSystemErrors { get; init; }

    public int TotalDatabaseChanges { get; init; }

    public int TotalUserAccounts { get; init; }

    public int ActiveUserAccounts { get; init; }

    public int TotalDepartments { get; init; }

    public int RecentPasswordChanges { get; init; }

    public string CurrentDatabaseVersion { get; init; } = string.Empty;

    public DateTime? LastDatabaseUpdate { get; init; }
}

public sealed class ISErrorTrendDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public int Day { get; init; }

    public int ErrorCount { get; init; }
}

public sealed class ISTopErrorDto
{
    public int ErrorNumber { get; init; }

    public string ErrorMessage { get; init; } = string.Empty;

    public int ErrorCount { get; init; }

    public DateTime? LastOccurrence { get; init; }
}

public sealed class ISUserErrorDto
{
    public string UserName { get; init; } = string.Empty;

    public int ErrorCount { get; init; }

    public DateTime? LastError { get; init; }
}

public sealed class ISDatabaseActivityDto
{
    public string DatabaseUser { get; init; } = string.Empty;

    public string Event { get; init; } = string.Empty;

    public int ActivityCount { get; init; }

    public DateTime? LastActivity { get; init; }
}

public sealed class ISEventTypeDto
{
    public string EventType { get; init; } = string.Empty;

    public int EventCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class ISUserAccountDto
{
    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public int UserCount { get; init; }

    public int ActiveUserCount { get; init; }
}

public sealed class ISPasswordAgeDto
{
    public string AgeRange { get; init; } = string.Empty;

    public int UserCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class ISDashboardFilterOptionsDto
{
    public IReadOnlyList<ISFilterLookupItemDto> Departments { get; init; } = [];

    public IReadOnlyList<ISFilterLookupItemDto> ErrorNumbers { get; init; } = [];
}

public sealed record ISFilterLookupItemDto(int Id, string Name);

internal sealed class ISErrorDetailRow
{
    public int ErrorLogId { get; init; }

    public DateTime ErrorTime { get; init; }

    public string UserName { get; init; } = string.Empty;

    public int ErrorNumber { get; init; }

    public string ErrorMessage { get; init; } = string.Empty;
}

internal sealed class ISDatabaseLogDetailRow
{
    public int DatabaseLogId { get; init; }

    public DateTime PostTime { get; init; }

    public string DatabaseUser { get; init; } = string.Empty;

    public string Event { get; init; } = string.Empty;

    public string? Tsql { get; init; }
}

internal sealed class ISUserAccountDetailRow
{
    public int BusinessEntityId { get; init; }

    public string LoginId { get; init; } = string.Empty;

    public bool CurrentFlag { get; init; }

    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public DateTime PasswordLastModified { get; init; }
}
