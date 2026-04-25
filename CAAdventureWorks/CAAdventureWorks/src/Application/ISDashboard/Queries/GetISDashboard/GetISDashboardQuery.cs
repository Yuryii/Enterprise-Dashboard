using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.ISDashboard.Queries.GetISDashboard;

public sealed record GetISDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    short? DepartmentId = null,
    int? ErrorNumber = null) : IRequest<ISDashboardResponseDto>;

public sealed class GetISDashboardQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetISDashboardQuery, ISDashboardResponseDto>
{
    public async Task<ISDashboardResponseDto> Handle(GetISDashboardQuery request, CancellationToken cancellationToken)
    {
        // Thiết lập khoảng thời gian mặc định (30 ngày gần nhất nếu không có filter)
        var endDate = request.EndDate ?? DateTime.Now;
        var startDate = request.StartDate ?? endDate.AddDays(-30);

        // 1. Query ErrorLog với filter
        var errorLogQuery = context.ErrorLogs.AsNoTracking()
            .Where(e => e.ErrorTime >= startDate && e.ErrorTime <= endDate)
            .Where(e => !request.ErrorNumber.HasValue || e.ErrorNumber == request.ErrorNumber.Value);

        var errorLogList = await errorLogQuery
            .Select(e => new ISErrorDetailRow
            {
                ErrorLogId = e.ErrorLogId,
                ErrorTime = e.ErrorTime,
                UserName = e.UserName,
                ErrorNumber = e.ErrorNumber,
                ErrorMessage = e.ErrorMessage
            })
            .ToListAsync(cancellationToken);

        // 2. Query DatabaseLog với filter
        var databaseLogQuery = context.DatabaseLogs.AsNoTracking()
            .Where(d => d.PostTime >= startDate && d.PostTime <= endDate);

        var databaseLogList = await databaseLogQuery
            .Select(d => new ISDatabaseLogDetailRow
            {
                DatabaseLogId = d.DatabaseLogId,
                PostTime = d.PostTime,
                DatabaseUser = d.DatabaseUser,
                Event = d.Event,
                Tsql = d.Tsql
            })
            .ToListAsync(cancellationToken);

        // 3. Query User Accounts (Employees + Passwords)
        var userAccountQuery = 
            from emp in context.Employees.AsNoTracking()
            join deptHist in context.EmployeeDepartmentHistories.AsNoTracking()
                on emp.BusinessEntityId equals deptHist.BusinessEntityId into deptHistGroup
            from deptHist in deptHistGroup.Where(dh => dh.EndDate == null).DefaultIfEmpty()
            join dept in context.Departments.AsNoTracking()
                on deptHist.DepartmentId equals dept.DepartmentId into deptGroup
            from dept in deptGroup.DefaultIfEmpty()
            join pwd in context.Passwords.AsNoTracking()
                on emp.BusinessEntityId equals pwd.BusinessEntityId into pwdGroup
            from pwd in pwdGroup.DefaultIfEmpty()
            where !request.DepartmentId.HasValue || deptHist.DepartmentId == request.DepartmentId.Value
            select new ISUserAccountDetailRow
            {
                BusinessEntityId = emp.BusinessEntityId,
                LoginId = emp.LoginId,
                CurrentFlag = emp.CurrentFlag,
                DepartmentId = deptHist != null ? deptHist.DepartmentId : (short)0,
                DepartmentName = dept != null ? dept.Name : "Chưa phân công",
                PasswordLastModified = pwd != null ? pwd.ModifiedDate : DateTime.MinValue
            };

        var userAccountList = await userAccountQuery.ToListAsync(cancellationToken);

        // 4. Lấy phiên bản database hiện tại
        var buildVersion = await context.AwbuildVersions.AsNoTracking()
            .OrderByDescending(v => v.ModifiedDate)
            .FirstOrDefaultAsync(cancellationToken);

        // 5. Tính toán các widget trong Dashboard
        var overview = BuildOverview(errorLogList, databaseLogList, userAccountList, buildVersion);
        var errorTrend = BuildErrorTrend(errorLogList);
        var topErrors = BuildTopErrors(errorLogList);
        var usersWithMostErrors = BuildUsersWithMostErrors(errorLogList);
        var databaseActivity = BuildDatabaseActivity(databaseLogList);
        var eventTypeDistribution = BuildEventTypeDistribution(databaseLogList);
        var userAccountsByDepartment = BuildUserAccountsByDepartment(userAccountList);
        var passwordAgeDistribution = BuildPasswordAgeDistribution(userAccountList);
        var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

        return new ISDashboardResponseDto
        {
            Filters = new ISDashboardAppliedFilterDto
            {
                StartDate = startDate,
                EndDate = endDate,
                DepartmentId = request.DepartmentId,
                ErrorNumber = request.ErrorNumber
            },
            Overview = overview,
            ErrorTrend = errorTrend,
            TopErrors = topErrors,
            UsersWithMostErrors = usersWithMostErrors,
            DatabaseActivity = databaseActivity,
            EventTypeDistribution = eventTypeDistribution,
            UserAccountsByDepartment = userAccountsByDepartment,
            PasswordAgeDistribution = passwordAgeDistribution,
            FilterOptions = filterOptions
        };
    }

    private static ISOverviewDto BuildOverview(
        IReadOnlyList<ISErrorDetailRow> errors,
        IReadOnlyList<ISDatabaseLogDetailRow> dbLogs,
        IReadOnlyList<ISUserAccountDetailRow> users,
        Domain.Entities.AwbuildVersion? buildVersion)
    {
        var thirtyDaysAgo = DateTime.Now.AddDays(-30);
        var recentPasswordChanges = users.Count(u => u.PasswordLastModified >= thirtyDaysAgo);

        var activeDepartments = users
            .Where(u => u.DepartmentId > 0)
            .Select(u => u.DepartmentId)
            .Distinct()
            .Count();

        return new ISOverviewDto
        {
            TotalSystemErrors = errors.Count,
            TotalDatabaseChanges = dbLogs.Count,
            TotalUserAccounts = users.Count,
            ActiveUserAccounts = users.Count(u => u.CurrentFlag),
            TotalDepartments = activeDepartments,
            RecentPasswordChanges = recentPasswordChanges,
            CurrentDatabaseVersion = buildVersion?.DatabaseVersion ?? "N/A",
            LastDatabaseUpdate = buildVersion?.ModifiedDate
        };
    }

    private static IReadOnlyList<ISErrorTrendDto> BuildErrorTrend(IReadOnlyList<ISErrorDetailRow> errors)
    {
        return errors
            .GroupBy(e => new { e.ErrorTime.Year, e.ErrorTime.Month, e.ErrorTime.Day })
            .Select(group => new ISErrorTrendDto
            {
                Period = $"{group.Key.Year}-{group.Key.Month:00}-{group.Key.Day:00}",
                Year = group.Key.Year,
                Month = group.Key.Month,
                Day = group.Key.Day,
                ErrorCount = group.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ThenBy(x => x.Day)
            .ToList();
    }

    private static IReadOnlyList<ISTopErrorDto> BuildTopErrors(IReadOnlyList<ISErrorDetailRow> errors)
    {
        return errors
            .GroupBy(e => new { e.ErrorNumber, e.ErrorMessage })
            .Select(group => new ISTopErrorDto
            {
                ErrorNumber = group.Key.ErrorNumber,
                ErrorMessage = group.Key.ErrorMessage.Length > 100 
                    ? group.Key.ErrorMessage.Substring(0, 100) + "..." 
                    : group.Key.ErrorMessage,
                ErrorCount = group.Count(),
                LastOccurrence = group.Max(e => e.ErrorTime)
            })
            .OrderByDescending(x => x.ErrorCount)
            .Take(10)
            .ToList();
    }

    private static IReadOnlyList<ISUserErrorDto> BuildUsersWithMostErrors(IReadOnlyList<ISErrorDetailRow> errors)
    {
        return errors
            .GroupBy(e => e.UserName)
            .Select(group => new ISUserErrorDto
            {
                UserName = group.Key,
                ErrorCount = group.Count(),
                LastError = group.Max(e => e.ErrorTime)
            })
            .OrderByDescending(x => x.ErrorCount)
            .Take(10)
            .ToList();
    }

    private static IReadOnlyList<ISDatabaseActivityDto> BuildDatabaseActivity(IReadOnlyList<ISDatabaseLogDetailRow> dbLogs)
    {
        return dbLogs
            .GroupBy(d => new { d.DatabaseUser, d.Event })
            .Select(group => new ISDatabaseActivityDto
            {
                DatabaseUser = group.Key.DatabaseUser,
                Event = group.Key.Event,
                ActivityCount = group.Count(),
                LastActivity = group.Max(d => d.PostTime)
            })
            .OrderByDescending(x => x.ActivityCount)
            .Take(15)
            .ToList();
    }

    private static IReadOnlyList<ISEventTypeDto> BuildEventTypeDistribution(IReadOnlyList<ISDatabaseLogDetailRow> dbLogs)
    {
        var total = dbLogs.Count;
        if (total == 0) return new List<ISEventTypeDto>();

        return dbLogs
            .GroupBy(d => d.Event)
            .Select(group => new ISEventTypeDto
            {
                EventType = group.Key,
                EventCount = group.Count(),
                Percentage = (decimal)group.Count() / total
            })
            .OrderByDescending(x => x.EventCount)
            .ToList();
    }

    private static IReadOnlyList<ISUserAccountDto> BuildUserAccountsByDepartment(IReadOnlyList<ISUserAccountDetailRow> users)
    {
        return users
            .GroupBy(u => new { u.DepartmentId, u.DepartmentName })
            .Select(group => new ISUserAccountDto
            {
                DepartmentId = group.Key.DepartmentId,
                DepartmentName = group.Key.DepartmentName,
                UserCount = group.Count(),
                ActiveUserCount = group.Count(u => u.CurrentFlag)
            })
            .OrderByDescending(x => x.UserCount)
            .ToList();
    }

    private static IReadOnlyList<ISPasswordAgeDto> BuildPasswordAgeDistribution(IReadOnlyList<ISUserAccountDetailRow> users)
    {
        if (!users.Any()) return new List<ISPasswordAgeDto>();

        var today = DateTime.Now;
        var total = users.Count;

        return users
            .Select(u => new
            {
                u.BusinessEntityId,
                DaysSinceChange = (today - u.PasswordLastModified).TotalDays
            })
            .GroupBy(u =>
                u.DaysSinceChange < 30 ? "< 30 ngày" :
                u.DaysSinceChange < 90 ? "30-90 ngày" :
                u.DaysSinceChange < 180 ? "90-180 ngày" :
                u.DaysSinceChange < 365 ? "180-365 ngày" : "365+ ngày")
            .Select(group => new ISPasswordAgeDto
            {
                AgeRange = group.Key,
                UserCount = group.Count(),
                Percentage = (decimal)group.Count() / total
            })
            .OrderBy(x => x.AgeRange)
            .ToList();
    }

    private async Task<ISDashboardFilterOptionsDto> BuildFilterOptionsAsync(CancellationToken cancellationToken)
    {
        var departments = await context.Departments.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new ISFilterLookupItemDto(x.DepartmentId, x.Name))
            .ToListAsync(cancellationToken);

        var errorNumbers = await context.ErrorLogs.AsNoTracking()
            .Select(e => e.ErrorNumber)
            .Distinct()
            .OrderBy(x => x)
            .Take(50)
            .Select(x => new ISFilterLookupItemDto(x, $"Error {x}"))
            .ToListAsync(cancellationToken);

        return new ISDashboardFilterOptionsDto
        {
            Departments = departments,
            ErrorNumbers = errorNumbers
        };
    }
}
