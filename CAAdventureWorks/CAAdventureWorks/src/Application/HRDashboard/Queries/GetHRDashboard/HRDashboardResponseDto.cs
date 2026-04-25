namespace CAAdventureWorks.Application.HRDashboard.Queries.GetHRDashboard;

public sealed class HRDashboardResponseDto
{
    public HRDashboardAppliedFilterDto Filters { get; init; } = new();

    public HROverviewDto Overview { get; init; } = new();

    public IReadOnlyList<HRTrendPointDto> EmployeeTrend { get; init; } = [];

    public IReadOnlyList<HRDepartmentItemDto> EmployeesByDepartment { get; init; } = [];

    public IReadOnlyList<HRJobTitleItemDto> TopJobTitles { get; init; } = [];

    public IReadOnlyList<HRGenderItemDto> GenderDistribution { get; init; } = [];

    public IReadOnlyList<HRPayRateItemDto> PayRateByDepartment { get; init; } = [];

    public IReadOnlyList<HRTenureItemDto> EmployeeTenure { get; init; } = [];

    public IReadOnlyList<HRShiftItemDto> ShiftDistribution { get; init; } = [];

    public HRDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class HRDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public short? DepartmentId { get; init; }

    public string? Gender { get; init; }

    public bool? SalariedOnly { get; init; }

    public bool? ActiveOnly { get; init; }
}

public sealed class HROverviewDto
{
    public int TotalEmployees { get; init; }

    public int ActiveEmployees { get; init; }

    public int TotalDepartments { get; init; }

    public decimal AveragePayRate { get; init; }

    public decimal AverageVacationHours { get; init; }

    public decimal AverageSickLeaveHours { get; init; }

    public double AverageTenureYears { get; init; }

    public int SalariedEmployees { get; init; }
}

public sealed class HRTrendPointDto
{
    public string Period { get; init; } = string.Empty;

    public int Year { get; init; }

    public int Month { get; init; }

    public int NewHires { get; init; }

    public int TotalEmployees { get; init; }
}

public sealed class HRDepartmentItemDto
{
    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public int EmployeeCount { get; init; }

    public decimal AveragePayRate { get; init; }
}

public sealed class HRJobTitleItemDto
{
    public string JobTitle { get; init; } = string.Empty;

    public int EmployeeCount { get; init; }

    public decimal AveragePayRate { get; init; }

    public decimal AverageVacationHours { get; init; }
}

public sealed class HRGenderItemDto
{
    public string Gender { get; init; } = string.Empty;

    public string GenderLabel { get; init; } = string.Empty;

    public int EmployeeCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class HRPayRateItemDto
{
    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public decimal MinPayRate { get; init; }

    public decimal MaxPayRate { get; init; }

    public decimal AveragePayRate { get; init; }
}

public sealed class HRTenureItemDto
{
    public string TenureRange { get; init; } = string.Empty;

    public int EmployeeCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class HRShiftItemDto
{
    public byte ShiftId { get; init; }

    public string ShiftName { get; init; } = string.Empty;

    public int EmployeeCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class HRDashboardFilterOptionsDto
{
    public IReadOnlyList<HRFilterLookupItemDto> Departments { get; init; } = [];
}

public sealed record HRFilterLookupItemDto(int Id, string Name);

internal sealed class HREmployeeDetailRow
{
    public int BusinessEntityId { get; init; }

    public string JobTitle { get; init; } = string.Empty;

    public DateOnly BirthDate { get; init; }

    public string MaritalStatus { get; init; } = string.Empty;

    public string Gender { get; init; } = string.Empty;

    public DateOnly HireDate { get; init; }

    public bool SalariedFlag { get; init; }

    public short VacationHours { get; init; }

    public short SickLeaveHours { get; init; }

    public bool CurrentFlag { get; init; }

    public short DepartmentId { get; init; }

    public string DepartmentName { get; init; } = string.Empty;

    public byte ShiftId { get; init; }

    public string ShiftName { get; init; } = string.Empty;

    public decimal Rate { get; init; }
}
