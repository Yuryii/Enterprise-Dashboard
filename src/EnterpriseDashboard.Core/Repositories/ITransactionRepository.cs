using EnterpriseDashboard.Core.Models;
using EnterpriseDashboard.Core.Models.Royalty;

namespace EnterpriseDashboard.Core.Repositories
{
    public interface ITransactionRepository
    {
        Task<PagedResult<TransactionDto>> GetAllPaging(string? userName,
          int fromMonth, int fromYear, int toMonth, int toYear, int pageIndex = 1, int pageSize = 10);
    }
}
