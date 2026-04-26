using Hangfire.Dashboard;

namespace CAAdventureWorks.Web;

/// <summary>
/// Allows all requests to the Hangfire dashboard in development.
/// In production, restrict to authenticated users with appropriate roles.
/// </summary>
public sealed class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
#if DEBUG
        return true;
#else
        var httpContext = context.GetHttpContext();
        return httpContext?.User.Identity?.IsAuthenticated == true;
#endif
    }
}
