using Microsoft.EntityFrameworkCore;
using EnterpriseDashboard.Core.Domain.Identity;
using EnterpriseDashboard.Core.Repositories;
using EnterpriseDashboard.Data.SeedWorks;

namespace EnterpriseDashboard.Data.Repositories
{
    public class UserRepository : RepositoryBase<AppUser, Guid>, IUserRepository
    {
        public UserRepository(EnterpriseDashboardContext context) : base(context)
        {
        }

        public async Task RemoveUserFromRoles(Guid userId, string[] roleNames)
        {
            if (roleNames == null || roleNames.Length == 0)
                return;
            foreach (var roleName in roleNames)
            {
                var role = await _context.Roles.FirstOrDefaultAsync(x => x.Name == roleName);
                if (role == null)
                {
                    return;
                }
                var userRole = await _context.UserRoles.FirstOrDefaultAsync(x => x.RoleId == role.Id && x.UserId == userId);
                if (userRole == null)
                {
                    return;
                }
                _context.UserRoles.Remove(userRole);
            }
        }
    }
}
