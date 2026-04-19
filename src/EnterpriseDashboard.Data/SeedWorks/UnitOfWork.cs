using AutoMapper;
using Microsoft.AspNetCore.Identity;
using EnterpriseDashboard.Core.Domain.Identity;
using EnterpriseDashboard.Core.Repositories;
using EnterpriseDashboard.Core.SeedWorks;
using EnterpriseDashboard.Data.Repositories;

namespace EnterpriseDashboard.Data.SeedWorks
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly EnterpriseDashboardContext _context;

        public UnitOfWork(EnterpriseDashboardContext context, IMapper mapper, UserManager<AppUser> userManager)
        {
            _context = context;
            Transactions = new TransactionRepository(context, mapper);
            Users = new UserRepository(context);
        }
        public ITransactionRepository Transactions { get; private set; }
        public IUserRepository Users { get; private set; }

        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
