using EnterpriseDashboard.Core.SeedWorks;
using EnterpriseDashboard.Core.Domain.Identity;

namespace EnterpriseDashboard.Core.Repositories
{
    public interface IUserRepository : IRepository<AppUser, Guid>
    {
        Task RemoveUserFromRoles(Guid userId, string[] roles);
    }
}
