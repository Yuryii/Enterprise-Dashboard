using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Application.DocumentControlDashboard.Queries.GetDocumentControlDashboard;

public sealed record GetDocumentControlDashboardQuery(
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    byte? Status = null,
    string? FileExtension = null) : IRequest<DocumentControlDashboardResponseDto>;

public sealed class GetDocumentControlDashboardQueryHandler(
    IApplicationDbContext context,
    ILogger<GetDocumentControlDashboardQueryHandler> logger)
    : IRequestHandler<GetDocumentControlDashboardQuery, DocumentControlDashboardResponseDto>
{
    public async Task<DocumentControlDashboardResponseDto> Handle(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        try
        {
            logger.LogInformation(
                "🔍 [Document Control Dashboard] Bắt đầu tải dữ liệu với filters: StartDate={StartDate}, EndDate={EndDate}, Status={Status}, FileExtension={FileExtension}",
                request.StartDate, request.EndDate, request.Status, request.FileExtension);

            logger.LogInformation("📊 [Document Control Dashboard] Bước 1/8: Đang build Overview...");
            var overview = await BuildOverviewAsync(request, cancellationToken);

            logger.LogInformation("📈 [Document Control Dashboard] Bước 2/8: Đang build Documents By Status...");
            var documentsByStatus = await BuildDocumentsByStatusAsync(request, cancellationToken);

            logger.LogInformation("📁 [Document Control Dashboard] Bước 3/8: Đang build Documents By File Type...");
            var documentsByFileType = await BuildDocumentsByFileTypeAsync(request, cancellationToken);

            logger.LogInformation("🏆 [Document Control Dashboard] Bước 4/8: Đang build Top Products With Documents...");
            var topProductsWithDocuments = await BuildTopProductsWithDocumentsAsync(request, cancellationToken);

            logger.LogInformation("👤 [Document Control Dashboard] Bước 5/8: Đang build Top Document Owners...");
            var topDocumentOwners = await BuildTopDocumentOwnersAsync(request, cancellationToken);

            logger.LogInformation("🔄 [Document Control Dashboard] Bước 6/8: Đang build Recent Revisions...");
            var recentRevisions = await BuildRecentRevisionsAsync(request, cancellationToken);

            logger.LogInformation("⏳ [Document Control Dashboard] Bước 7/8: Đang build Pending Approvals...");
            var pendingApprovals = await BuildPendingApprovalsAsync(request, cancellationToken);

            logger.LogInformation("⚠️ [Document Control Dashboard] Bước 8/8: Đang build Products Without Documents...");
            var productsWithoutDocuments = await BuildProductsWithoutDocumentsAsync(cancellationToken);

            logger.LogInformation("🔧 [Document Control Dashboard] Đang build Filter Options...");
            var filterOptions = await BuildFilterOptionsAsync(cancellationToken);

            logger.LogInformation("✅ [Document Control Dashboard] Hoàn thành tải dữ liệu thành công!");

            return new DocumentControlDashboardResponseDto
            {
                Filters = new DocumentControlDashboardAppliedFilterDto
                {
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    Status = request.Status,
                    FileExtension = request.FileExtension
                },
                Overview = overview,
                DocumentsByStatus = documentsByStatus,
                DocumentsByFileType = documentsByFileType,
                TopProductsWithDocuments = topProductsWithDocuments,
                TopDocumentOwners = topDocumentOwners,
                RecentRevisions = recentRevisions,
                PendingApprovals = pendingApprovals,
                ProductsWithoutDocuments = productsWithoutDocuments,
                FilterOptions = filterOptions
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "❌ [Document Control Dashboard] LỖI khi tải dữ liệu: {ErrorMessage}. StackTrace: {StackTrace}",
                ex.Message, ex.StackTrace);
            throw;
        }
    }

    private async Task<DocumentControlOverviewDto> BuildOverviewAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        // Sử dụng ProductDescription làm "documents"
        var descriptions = context.ProductDescriptions
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.ModifiedDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.ModifiedDate <= request.EndDate.Value);

        var totalDocuments = await descriptions.CountAsync(cancellationToken);

        // Sử dụng ProductModel làm "folders"
        var totalFolders = await context.ProductModels
            .AsNoTracking()
            .CountAsync(cancellationToken);

        // Sử dụng Illustration làm "files"
        var totalFiles = await context.Illustrations
            .AsNoTracking()
            .CountAsync(cancellationToken);

        // Mô phỏng status: dựa vào ModifiedDate
        var now = DateTime.UtcNow;
        var allDocs = await descriptions.Select(x => x.ModifiedDate).ToListAsync(cancellationToken);
        
        var approvedDocuments = allDocs.Count(x => (now - x).TotalDays > 30); // Cũ hơn 30 ngày = approved
        var pendingDocuments = allDocs.Count(x => (now - x).TotalDays <= 30 && (now - x).TotalDays > 7); // 7-30 ngày = pending
        var obsoleteDocuments = allDocs.Count(x => (now - x).TotalDays > 365); // Cũ hơn 1 năm = obsolete

        // Products với/không có documents
        var productsWithDocs = await context.ProductModelProductDescriptionCultures
            .AsNoTracking()
            .Join(context.Products.AsNoTracking(),
                pmpdc => pmpdc.ProductModelId,
                p => p.ProductModelId,
                (pmpdc, p) => p.ProductId)
            .Distinct()
            .CountAsync(cancellationToken);

        var totalProducts = await context.Products.AsNoTracking().CountAsync(cancellationToken);
        var productsWithoutDocs = totalProducts - productsWithDocs;

        return new DocumentControlOverviewDto
        {
            TotalDocuments = totalDocuments,
            TotalFolders = totalFolders,
            TotalFiles = totalFiles,
            ApprovedDocuments = approvedDocuments,
            PendingDocuments = pendingDocuments,
            ObsoleteDocuments = obsoleteDocuments,
            ProductsWithDocuments = productsWithDocs,
            ProductsWithoutDocuments = productsWithoutDocs,
            DocumentCoverageRate = totalProducts == 0 ? 0m : (decimal)productsWithDocs / totalProducts
        };
    }

    private async Task<IReadOnlyList<DocumentControlStatusItemDto>> BuildDocumentsByStatusAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var descriptions = await context.ProductDescriptions
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.ModifiedDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.ModifiedDate <= request.EndDate.Value)
            .Select(x => x.ModifiedDate)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var total = descriptions.Count;

        var statuses = new List<DocumentControlStatusItemDto>
        {
            new()
            {
                Status = 1,
                StatusLabel = "Đã phê duyệt",
                DocumentCount = descriptions.Count(x => (now - x).TotalDays > 30),
                Percentage = total == 0 ? 0m : (decimal)descriptions.Count(x => (now - x).TotalDays > 30) / total * 100
            },
            new()
            {
                Status = 2,
                StatusLabel = "Đang chờ duyệt",
                DocumentCount = descriptions.Count(x => (now - x).TotalDays <= 30 && (now - x).TotalDays > 7),
                Percentage = total == 0 ? 0m : (decimal)descriptions.Count(x => (now - x).TotalDays <= 30 && (now - x).TotalDays > 7) / total * 100
            },
            new()
            {
                Status = 3,
                StatusLabel = "Đang soạn thảo",
                DocumentCount = descriptions.Count(x => (now - x).TotalDays <= 7),
                Percentage = total == 0 ? 0m : (decimal)descriptions.Count(x => (now - x).TotalDays <= 7) / total * 100
            },
            new()
            {
                Status = 4,
                StatusLabel = "Lỗi thời",
                DocumentCount = descriptions.Count(x => (now - x).TotalDays > 365),
                Percentage = total == 0 ? 0m : (decimal)descriptions.Count(x => (now - x).TotalDays > 365) / total * 100
            }
        };

        return request.Status.HasValue
            ? statuses.Where(x => x.Status == request.Status.Value).ToList()
            : statuses;
    }

    private async Task<IReadOnlyList<DocumentControlFileTypeItemDto>> BuildDocumentsByFileTypeAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var total = await context.ProductDescriptions
            .AsNoTracking()
            .Where(x => !request.StartDate.HasValue || x.ModifiedDate >= request.StartDate.Value)
            .Where(x => !request.EndDate.HasValue || x.ModifiedDate <= request.EndDate.Value)
            .CountAsync(cancellationToken);

        // Mô phỏng file types
        var fileTypes = new List<DocumentControlFileTypeItemDto>
        {
            new() { FileExtension = ".pdf", DocumentCount = (int)(total * 0.4m), Percentage = 40m },
            new() { FileExtension = ".docx", DocumentCount = (int)(total * 0.3m), Percentage = 30m },
            new() { FileExtension = ".xlsx", DocumentCount = (int)(total * 0.15m), Percentage = 15m },
            new() { FileExtension = ".txt", DocumentCount = (int)(total * 0.1m), Percentage = 10m },
            new() { FileExtension = ".xml", DocumentCount = (int)(total * 0.05m), Percentage = 5m }
        };

        return request.FileExtension != null
            ? fileTypes.Where(x => x.FileExtension == request.FileExtension).ToList()
            : fileTypes;
    }

    private async Task<IReadOnlyList<DocumentControlProductItemDto>> BuildTopProductsWithDocumentsAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var query = from pmpdc in context.ProductModelProductDescriptionCultures.AsNoTracking()
                    join pd in context.ProductDescriptions.AsNoTracking() on pmpdc.ProductDescriptionId equals pd.ProductDescriptionId
                    join pm in context.ProductModels.AsNoTracking() on pmpdc.ProductModelId equals pm.ProductModelId
                    join p in context.Products.AsNoTracking() on pm.ProductModelId equals p.ProductModelId
                    where !request.StartDate.HasValue || pd.ModifiedDate >= request.StartDate.Value
                    where !request.EndDate.HasValue || pd.ModifiedDate <= request.EndDate.Value
                    group new { p, pmpdc } by new { p.ProductId, p.Name, p.ProductNumber } into g
                    orderby g.Count() descending
                    select new DocumentControlProductItemDto
                    {
                        ProductId = g.Key.ProductId,
                        ProductName = g.Key.Name,
                        ProductNumber = g.Key.ProductNumber,
                        DocumentCount = g.Count()
                    };

        return await query.Take(10).ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<DocumentControlOwnerItemDto>> BuildTopDocumentOwnersAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        // Sử dụng Employee làm document owners
        var employees = await (from e in context.Employees.AsNoTracking()
                               join p in context.People.AsNoTracking() on e.BusinessEntityId equals p.BusinessEntityId
                               select new
                               {
                                   e.BusinessEntityId,
                                   OwnerName = p.FirstName + " " + p.LastName,
                                   e.JobTitle
                               })
            .Take(50)
            .ToListAsync(cancellationToken);

        // Mô phỏng số lượng documents ở client side
        var result = employees
            .Select(e => new DocumentControlOwnerItemDto
            {
                OwnerId = e.BusinessEntityId,
                OwnerName = e.OwnerName,
                JobTitle = e.JobTitle,
                DocumentCount = new Random(e.BusinessEntityId).Next(5, 50)
            })
            .OrderByDescending(x => x.DocumentCount)
            .Take(10)
            .ToList();

        return result;
    }

    private async Task<IReadOnlyList<DocumentControlRevisionItemDto>> BuildRecentRevisionsAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var query = from pd in context.ProductDescriptions.AsNoTracking()
                    join pmpdc in context.ProductModelProductDescriptionCultures.AsNoTracking() on pd.ProductDescriptionId equals pmpdc.ProductDescriptionId
                    join pm in context.ProductModels.AsNoTracking() on pmpdc.ProductModelId equals pm.ProductModelId
                    where !request.StartDate.HasValue || pd.ModifiedDate >= request.StartDate.Value
                    where !request.EndDate.HasValue || pd.ModifiedDate <= request.EndDate.Value
                    orderby pd.ModifiedDate descending
                    select new DocumentControlRevisionItemDto
                    {
                        DocumentNode = pd.ProductDescriptionId,
                        Title = pm.Name,
                        Revision = "Rev " + (pd.ProductDescriptionId % 10).ToString(),
                        ModifiedDate = pd.ModifiedDate,
                        OwnerName = "System Admin"
                    };

        return await query.Take(10).ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<DocumentControlPendingItemDto>> BuildPendingApprovalsAsync(
        GetDocumentControlDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sevenDaysAgo = now.AddDays(-7);
        
        var query = from pd in context.ProductDescriptions.AsNoTracking()
                    join pmpdc in context.ProductModelProductDescriptionCultures.AsNoTracking() on pd.ProductDescriptionId equals pmpdc.ProductDescriptionId
                    join pm in context.ProductModels.AsNoTracking() on pmpdc.ProductModelId equals pm.ProductModelId
                    where !request.StartDate.HasValue || pd.ModifiedDate >= request.StartDate.Value
                    where !request.EndDate.HasValue || pd.ModifiedDate <= request.EndDate.Value
                    where pd.ModifiedDate >= thirtyDaysAgo && pd.ModifiedDate <= sevenDaysAgo
                    orderby pd.ModifiedDate descending
                    select new DocumentControlPendingItemDto
                    {
                        DocumentNode = pd.ProductDescriptionId,
                        Title = pm.Name,
                        FileName = pm.Name + ".pdf",
                        Revision = "Rev " + (pd.ProductDescriptionId % 10).ToString(),
                        OwnerName = "Pending Review",
                        ModifiedDate = pd.ModifiedDate
                    };

        return await query.Take(10).ToListAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<DocumentControlProductWithoutDocDto>> BuildProductsWithoutDocumentsAsync(
        CancellationToken cancellationToken)
    {
        var productsWithDocs = context.ProductModelProductDescriptionCultures
            .AsNoTracking()
            .Join(context.Products.AsNoTracking(),
                pmpdc => pmpdc.ProductModelId,
                p => p.ProductModelId,
                (pmpdc, p) => p.ProductId)
            .Distinct();

        var query = from p in context.Products.AsNoTracking()
                    where !productsWithDocs.Contains(p.ProductId)
                    orderby p.ProductId
                    select new DocumentControlProductWithoutDocDto
                    {
                        ProductId = p.ProductId,
                        ProductName = p.Name,
                        ProductNumber = p.ProductNumber,
                        SellStartDate = true
                    };

        return await query.Take(20).ToListAsync(cancellationToken);
    }

    private async Task<DocumentControlDashboardFilterOptionsDto> BuildFilterOptionsAsync(
        CancellationToken cancellationToken)
    {
        var statuses = new List<DocumentControlFilterLookupItemDto>
        {
            new(1, "Đã phê duyệt"),
            new(2, "Đang chờ duyệt"),
            new(3, "Đang soạn thảo"),
            new(4, "Lỗi thời")
        };

        var fileExtensions = new List<DocumentControlFilterLookupItemDto>
        {
            new(1, ".pdf"),
            new(2, ".docx"),
            new(3, ".xlsx"),
            new(4, ".txt"),
            new(5, ".xml")
        };

        return await Task.FromResult(new DocumentControlDashboardFilterOptionsDto
        {
            Statuses = statuses,
            FileExtensions = fileExtensions
        });
    }
}
