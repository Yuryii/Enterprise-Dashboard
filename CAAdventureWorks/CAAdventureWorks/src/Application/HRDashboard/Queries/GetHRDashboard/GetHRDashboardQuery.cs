using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.HRDashboard.Queries.GetHRDashboard;

public sealed record GetHRDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    short? DepartmentId = null,
    string? Gender = null,
    bool? SalariedOnly = null,
    bool? ActiveOnly = null) : IRequest<HRDashboardResponseDto>;

public sealed class GetHRDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetHRDashboardQuery, HRDashboardResponseDto>
{
    public async Task<HRDashboardResponseDto> Handle(GetHRDashboardQuery request, CancellationToken cancellationToken)
    {
        // 1. Query cơ bản cho employees với các filter
        var baseEmployeeQuery = context.Employees.AsNoTracking()
            .Where(e => request.ActiveOnly != true || e.CurrentFlag)
            .Where(e => string.IsNullOrEmpty(request.Gender) || e.Gender == request.Gender)
            .Where(e => request.SalariedOnly != true || e.SalariedFlag)
            .Where(e => !request.StartDate.HasValue || e.HireDate >= DateOnly.FromDateTime(request.StartDate.Value))
            .Where(e => !request.EndDate.HasValue || e.HireDate <= DateOnly.FromDateTime(request.EndDate.Value));

        // 2. Nếu có filter department, chỉ lấy employees trong department đó
        if (request.DepartmentId.HasValue)
        {
            var deptEmployeeIds = context.EmployeeDepartmentHistories.AsNoTracking()
                .Where(dh => dh.DepartmentId == request.DepartmentId.Value && dh.EndDate == null)
                .Select(dh => dh.BusinessEntityId);
            
            baseEmployeeQuery = baseEmployeeQuery.Where(e => deptEmployeeIds.Contains(e.BusinessEntityId));
        }

        // 3. LEFT JOIN để lấy thông tin department và shift
        var employeeDetails =
            from emp in baseEmployeeQuery
            join deptHist in context.EmployeeDepartmentHistories.AsNoTracking()
                on emp.BusinessEntityId equals deptHist.BusinessEntityId into deptHistGroup
            from deptHist in deptHistGroup.Where(dh => dh.EndDate == null).DefaultIfEmpty()
            join dept in context.Departments.AsNoTracking()
                on deptHist.DepartmentId equals dept.DepartmentId into deptGroup
            from dept in deptGroup.DefaultIfEmpty()
            join shift in context.Shifts.AsNoTracking()
                on deptHist.ShiftId equals shift.ShiftId into shiftGroup
            from shift in shiftGroup.DefaultIfEmpty()
            select new
            {
                emp.BusinessEntityId,
                emp.JobTitle,
                emp.BirthDate,
                emp.MaritalStatus,
                emp.Gender,
                emp.HireDate,
                emp.SalariedFlag,
                emp.VacationHours,
                emp.SickLeaveHours,
                emp.CurrentFlag,
                DepartmentId = deptHist != null ? deptHist.DepartmentId : (short)0,
                DepartmentName = dept != null ? dept.Name : "Chưa phân công",
                ShiftId = deptHist != null ? deptHist.ShiftId : (byte)0,
                ShiftName = shift != null ? shift.Name : "Chưa có ca"
            };

        // 4. Lấy mức lương mới nhất của mỗi nhân viên
        var latestPayRates =
            from pay in context.EmployeePayHistories.AsNoTracking()
            group pay by pay.BusinessEntityId into g
            select new
            {
                BusinessEntityId = g.Key,
                LatestRate = g.OrderByDescending(x => x.RateChangeDate).First().Rate,
                PayFrequency = g.OrderByDescending(x => x.RateChangeDate).First().PayFrequency
            };

        // 5. Lắp ghép dữ liệu hoàn chỉnh (Chưa gọi vào DB)
        var employeeDetailsWithPayQuery =
            from emp in employeeDetails
            join pay in latestPayRates on emp.BusinessEntityId equals pay.BusinessEntityId into payGroup
            from pay in payGroup.DefaultIfEmpty()
            select new HREmployeeDetailRow
            {
                BusinessEntityId = emp.BusinessEntityId,
                JobTitle = emp.JobTitle,
                BirthDate = emp.BirthDate,
                MaritalStatus = emp.MaritalStatus,
                Gender = emp.Gender,
                HireDate = emp.HireDate,
                SalariedFlag = emp.SalariedFlag,
                VacationHours = emp.VacationHours,
                SickLeaveHours = emp.SickLeaveHours,
                CurrentFlag = emp.CurrentFlag,
                DepartmentId = emp.DepartmentId,
                DepartmentName = emp.DepartmentName,
                ShiftId = emp.ShiftId,
                ShiftName = emp.ShiftName,
                Rate = pay != null ? pay.LatestRate : 0m
            };

        // =========================================================================
        // TỐI ƯU HÓA: Thực thi Query LẤY DỮ LIỆU DUY NHẤT 1 LẦN lên Memory (RAM)
        // =========================================================================
        var employeeDataList = await employeeDetailsWithPayQuery.ToListAsync(cancellationToken);

        // 6. Tính toán các widget trong Dashboard bằng Data trên RAM (Nhanh hơn rất nhiều)
        var overview = BuildOverview(employeeDataList);
        var employeeTrend = BuildEmployeeTrend(employeeDataList);
        var employeesByDepartment = BuildEmployeesByDepartment(employeeDataList);
        var topJobTitles = BuildTopJobTitles(employeeDataList);
        var genderDistribution = BuildGenderDistribution(employeeDataList);
        var payRateByDepartment = BuildPayRateByDepartment(employeeDataList);
        var employeeTenure = BuildEmployeeTenure(employeeDataList);
        var shiftDistribution = BuildShiftDistribution(employeeDataList);
        
        // (Riêng Filter Options phải query bảng Department riêng nên vẫn gọi DB)
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new HRDashboardResponseDto
        {
            Filters = new HRDashboardAppliedFilterDto
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                DepartmentId = request.DepartmentId,
                Gender = request.Gender,
                SalariedOnly = request.SalariedOnly,
                ActiveOnly = request.ActiveOnly
            },
            Overview = overview,
            EmployeeTrend = employeeTrend,
            EmployeesByDepartment = employeesByDepartment,
            TopJobTitles = topJobTitles,
            GenderDistribution = genderDistribution,
            PayRateByDepartment = payRateByDepartment,
            EmployeeTenure = employeeTenure,
            ShiftDistribution = shiftDistribution,
            FilterOptions = filterOptions
        };
    }

    private static HROverviewDto BuildOverview(IReadOnlyList<HREmployeeDetailRow> employeeList)
    {
        if (!employeeList.Any())
        {
            return new HROverviewDto();
        }

        var today = DateOnly.FromDateTime(DateTime.Today);
        var avgTenure = employeeList
            .Select(x => (today.ToDateTime(TimeOnly.MinValue) - x.HireDate.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25)
            .Average();

        var totalDepartments = employeeList
            .Where(x => x.DepartmentId > 0)
            .Select(x => x.DepartmentId)
            .Distinct()
            .Count();

        return new HROverviewDto
        {
            TotalEmployees = employeeList.Count,
            ActiveEmployees = employeeList.Count(x => x.CurrentFlag),
            TotalDepartments = totalDepartments,
            AveragePayRate = employeeList.Where(x => x.Rate > 0).Any() ? employeeList.Where(x => x.Rate > 0).Average(x => x.Rate) : 0m,
            AverageVacationHours = employeeList.Average(x => (decimal)x.VacationHours),
            AverageSickLeaveHours = employeeList.Average(x => (decimal)x.SickLeaveHours),
            AverageTenureYears = avgTenure,
            SalariedEmployees = employeeList.Count(x => x.SalariedFlag)
        };
    }

    private static IReadOnlyList<HRTrendPointDto> BuildEmployeeTrend(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        return employees
            .GroupBy(x => new { x.HireDate.Year, x.HireDate.Month })
            .Select(group => new HRTrendPointDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                NewHires = group.Count(),
                TotalEmployees = group.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToList();
    }

    private static IReadOnlyList<HRDepartmentItemDto> BuildEmployeesByDepartment(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        return employees
            .GroupBy(x => new { x.DepartmentId, x.DepartmentName })
            .Select(group => new HRDepartmentItemDto
            {
                DepartmentId = group.Key.DepartmentId,
                DepartmentName = group.Key.DepartmentName,
                EmployeeCount = group.Count(),
                AveragePayRate = group.Where(x => x.Rate > 0).Any() ? group.Where(x => x.Rate > 0).Average(x => x.Rate) : 0m
            })
            .OrderByDescending(x => x.EmployeeCount)
            .ToList();
    }

    private static IReadOnlyList<HRJobTitleItemDto> BuildTopJobTitles(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        return employees
            .GroupBy(x => x.JobTitle)
            .Select(group => new HRJobTitleItemDto
            {
                JobTitle = group.Key,
                EmployeeCount = group.Count(),
                AveragePayRate = group.Where(x => x.Rate > 0).Any() ? group.Where(x => x.Rate > 0).Average(x => x.Rate) : 0m,
                AverageVacationHours = group.Average(x => (decimal)x.VacationHours)
            })
            .OrderByDescending(x => x.EmployeeCount)
            .Take(10)
            .ToList();
    }

    private static IReadOnlyList<HRGenderItemDto> BuildGenderDistribution(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        var total = employees.Count;
        if (total == 0) return new List<HRGenderItemDto>();

        return employees
            .GroupBy(x => x.Gender)
            .Select(group => new HRGenderItemDto
            {
                Gender = group.Key,
                GenderLabel = group.Key == "M" ? "Nam" : group.Key == "F" ? "Nữ" : "Khác",
                EmployeeCount = group.Count(),
                Percentage = (decimal)group.Count() / total
            })
            .OrderByDescending(x => x.EmployeeCount)
            .ToList();
    }

    private static IReadOnlyList<HRPayRateItemDto> BuildPayRateByDepartment(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        return employees
            .Where(x => x.Rate > 0)
            .GroupBy(x => new { x.DepartmentId, x.DepartmentName })
            .Select(group => new HRPayRateItemDto
            {
                DepartmentId = group.Key.DepartmentId,
                DepartmentName = group.Key.DepartmentName,
                MinPayRate = group.Min(x => x.Rate),
                MaxPayRate = group.Max(x => x.Rate),
                AveragePayRate = group.Average(x => x.Rate)
            })
            .OrderByDescending(x => x.AveragePayRate)
            .Take(10)
            .ToList();
    }

    private static IReadOnlyList<HRTenureItemDto> BuildEmployeeTenure(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        if (!employees.Any()) return new List<HRTenureItemDto>();

        var today = DateOnly.FromDateTime(DateTime.Today);
        var total = employees.Count;

        return employees
            .Select(x => new
            {
                x.BusinessEntityId,
                TenureYears = (today.ToDateTime(TimeOnly.MinValue) - x.HireDate.ToDateTime(TimeOnly.MinValue)).TotalDays / 365.25
            })
            .GroupBy(x =>
                x.TenureYears < 1 ? "< 1 năm" :
                x.TenureYears < 3 ? "1-3 năm" :
                x.TenureYears < 5 ? "3-5 năm" :
                x.TenureYears < 10 ? "5-10 năm" : "10+ năm")
            .Select(group => new HRTenureItemDto
            {
                TenureRange = group.Key,
                EmployeeCount = group.Count(),
                Percentage = (decimal)group.Count() / total
            })
            .OrderBy(x => x.TenureRange)
            .ToList();
    }

    private static IReadOnlyList<HRShiftItemDto> BuildShiftDistribution(IReadOnlyList<HREmployeeDetailRow> employees)
    {
        var total = employees.Count;
        //in console
        Console.WriteLine($"Total employees: {total}");
        if (total == 0) return new List<HRShiftItemDto>();

        return employees
            .GroupBy(x => new { x.ShiftId, x.ShiftName })
            .Select(group => new HRShiftItemDto
            {
                ShiftId = group.Key.ShiftId,
                ShiftName = group.Key.ShiftName,
                EmployeeCount = group.Count(),
                Percentage = (decimal)group.Count() / total
            })
            .OrderByDescending(x => x.EmployeeCount)
            .ToList();
    }

    private async Task<HRDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var departments = await context.Departments.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new HRFilterLookupItemDto(x.DepartmentId, x.Name))
            .ToListAsync(cancellationToken);

        return new HRDashboardFilterOptionsDto
        {
            Departments = departments
        };
    }
}