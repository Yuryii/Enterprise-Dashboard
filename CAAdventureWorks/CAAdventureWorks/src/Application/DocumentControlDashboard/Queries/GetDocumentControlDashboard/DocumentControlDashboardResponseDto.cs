namespace CAAdventureWorks.Application.DocumentControlDashboard.Queries.GetDocumentControlDashboard;

public sealed class DocumentControlDashboardResponseDto
{
    public DocumentControlDashboardAppliedFilterDto Filters { get; init; } = new();

    public DocumentControlOverviewDto Overview { get; init; } = new();

    public IReadOnlyList<DocumentControlStatusItemDto> DocumentsByStatus { get; init; } = [];

    public IReadOnlyList<DocumentControlFileTypeItemDto> DocumentsByFileType { get; init; } = [];

    public IReadOnlyList<DocumentControlProductItemDto> TopProductsWithDocuments { get; init; } = [];

    public IReadOnlyList<DocumentControlOwnerItemDto> TopDocumentOwners { get; init; } = [];

    public IReadOnlyList<DocumentControlRevisionItemDto> RecentRevisions { get; init; } = [];

    public IReadOnlyList<DocumentControlPendingItemDto> PendingApprovals { get; init; } = [];

    public IReadOnlyList<DocumentControlProductWithoutDocDto> ProductsWithoutDocuments { get; init; } = [];

    public DocumentControlDashboardFilterOptionsDto FilterOptions { get; init; } = new();
}

public sealed class DocumentControlDashboardAppliedFilterDto
{
    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }

    public byte? Status { get; init; }

    public string? FileExtension { get; init; }
}

public sealed class DocumentControlOverviewDto
{
    public int TotalDocuments { get; init; }

    public int TotalFolders { get; init; }

    public int TotalFiles { get; init; }

    public int ApprovedDocuments { get; init; }

    public int PendingDocuments { get; init; }

    public int ObsoleteDocuments { get; init; }

    public int ProductsWithDocuments { get; init; }

    public int ProductsWithoutDocuments { get; init; }

    public decimal DocumentCoverageRate { get; init; }
}

public sealed class DocumentControlStatusItemDto
{
    public byte Status { get; init; }

    public string StatusLabel { get; init; } = string.Empty;

    public int DocumentCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class DocumentControlFileTypeItemDto
{
    public string FileExtension { get; init; } = string.Empty;

    public int DocumentCount { get; init; }

    public decimal Percentage { get; init; }
}

public sealed class DocumentControlProductItemDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string ProductNumber { get; init; } = string.Empty;

    public int DocumentCount { get; init; }
}

public sealed class DocumentControlOwnerItemDto
{
    public int OwnerId { get; init; }

    public string OwnerName { get; init; } = string.Empty;

    public string JobTitle { get; init; } = string.Empty;

    public int DocumentCount { get; init; }
}

public sealed class DocumentControlRevisionItemDto
{
    public int DocumentNode { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Revision { get; init; } = string.Empty;

    public DateTime ModifiedDate { get; init; }

    public string OwnerName { get; init; } = string.Empty;
}

public sealed class DocumentControlPendingItemDto
{
    public int DocumentNode { get; init; }

    public string Title { get; init; } = string.Empty;

    public string FileName { get; init; } = string.Empty;

    public string Revision { get; init; } = string.Empty;

    public string OwnerName { get; init; } = string.Empty;

    public DateTime ModifiedDate { get; init; }
}

public sealed class DocumentControlProductWithoutDocDto
{
    public int ProductId { get; init; }

    public string ProductName { get; init; } = string.Empty;

    public string ProductNumber { get; init; } = string.Empty;

    public bool SellStartDate { get; init; }
}

public sealed class DocumentControlDashboardFilterOptionsDto
{
    public IReadOnlyList<DocumentControlFilterLookupItemDto> Statuses { get; init; } = [];

    public IReadOnlyList<DocumentControlFilterLookupItemDto> FileExtensions { get; init; } = [];
}

public sealed record DocumentControlFilterLookupItemDto(int Id, string Name);
