using EnterpriseDashboard.Core.Repositories;

namespace EnterpriseDashboard.Core.SeedWorks
{
    public interface IUnitOfWork
    {
        ITransactionRepository Transactions { get; }
        IUserRepository Users { get; }

        Task<int> CompleteAsync();
    }
}
