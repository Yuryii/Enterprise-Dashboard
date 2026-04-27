using System.Collections.Concurrent;
using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using CAAdventureWorks.Domain.Entities;
using CAAdventureWorks.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Web.Services;

public sealed record SalesOrderImportStatusDto(
    string JobId,
    string Status,
    int TotalRows,
    int ProcessedRows,
    int InsertedRows,
    int FailedRows,
    string? Message);

public sealed class SalesOrderImportJob(ApplicationDbContext context)
{
    private const int BatchSize = 200;
    private static readonly ConcurrentDictionary<string, SalesOrderImportStatusDto> Statuses = new();

    public static SalesOrderImportStatusDto CreateStatus(string jobId)
    {
        var status = new SalesOrderImportStatusDto(jobId, "Queued", 0, 0, 0, 0, "Đã đưa file vào hàng đợi xử lý nền.");
        Statuses[jobId] = status;
        return status;
    }

    public static SalesOrderImportStatusDto? GetStatus(string jobId) =>
        Statuses.TryGetValue(jobId, out var status) ? status : null;

    public async Task ProcessAsync(string jobId, string filePath)
    {
        try
        {
            Update(jobId, "Reading", 0, 0, 0, 0, "Đang đọc file Excel...");
            var rows = await ReadRowsAsync(filePath);
            Update(jobId, "Processing", rows.Count, 0, 0, 0, $"Đang chia lô {BatchSize} dòng để insert...");

            var defaults = await LoadDefaultsAsync();
            var inserted = 0;
            var failed = 0;

            foreach (var chunk in rows.Chunk(BatchSize))
            {
                var entities = new List<SalesOrderHeader>();

                foreach (var row in chunk)
                {
                    try
                    {
                        entities.Add(BuildOrder(row, defaults));
                    }
                    catch
                    {
                        failed++;
                    }
                }

                if (entities.Count > 0)
                {
                    context.SalesOrderHeaders.AddRange(entities);
                    await context.SaveChangesAsync(CancellationToken.None);
                    context.ChangeTracker.Clear();
                    inserted += entities.Count;
                }

                Update(jobId, "Processing", rows.Count, Math.Min(inserted + failed, rows.Count), inserted, failed, $"Đã xử lý {inserted + failed}/{rows.Count} dòng...");
            }

            Update(jobId, "Completed", rows.Count, rows.Count, inserted, failed, $"Hoàn tất nhập {inserted} dòng. Lỗi {failed} dòng.");
        }
        catch (Exception ex)
        {
            var current = GetStatus(jobId);
            Update(jobId, "Failed", current?.TotalRows ?? 0, current?.ProcessedRows ?? 0, current?.InsertedRows ?? 0, current?.FailedRows ?? 0, ex.Message);
        }
        finally
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }

    private static void Update(string jobId, string status, int totalRows, int processedRows, int insertedRows, int failedRows, string? message) =>
        Statuses[jobId] = new SalesOrderImportStatusDto(jobId, status, totalRows, processedRows, insertedRows, failedRows, message);

    private static async Task<List<ImportRow>> ReadRowsAsync(string filePath)
    {
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        var tableRows = extension is ".xlsx" or ".xls"
            ? ReadWorkbookRows(filePath)
            : await ReadTextRowsAsync(filePath);

        return tableRows.Select((cells, index) =>
        {
            var offset = LooksLikeImportOrderNumber(cells.ElementAtOrDefault(0)) ? 1 : 0;
            var onlineFlagIndex = FindColumnIndex(cells, offset, "OnlineOrderFlag", 13);
            var productIndex = FindColumnIndex(cells, offset, "ProductID", 15);
            var specialOfferIndex = FindColumnIndex(cells, offset, "SpecialOfferID", 16);
            var qtyIndex = FindColumnIndex(cells, offset, "SL", 17);
            var priceIndex = FindColumnIndex(cells, offset, "Đơn giá", 18);
            var discountIndex = FindColumnIndex(cells, offset, "Giảm", 19);
            var isCreateOrderTemplate = cells.Length > Math.Max(onlineFlagIndex, Math.Max(productIndex, Math.Max(specialOfferIndex, Math.Max(qtyIndex, Math.Max(priceIndex, discountIndex)))));
            var customerIndex = isCreateOrderTemplate ? FindColumnIndex(cells, offset, "CustomerID", 4) : offset + 2;
            var statusIndex = isCreateOrderTemplate ? FindColumnIndex(cells, offset, "Trạng thái", 3) : offset + 4;
            var taxIndex = isCreateOrderTemplate ? FindColumnIndex(cells, offset, "Thuế", 10) : offset + 9;
            var freightIndex = isCreateOrderTemplate ? FindColumnIndex(cells, offset, "Phí vận chuyển", 11) : offset + 10;
            var purchaseOrderIndex = FindColumnIndex(cells, offset, "PO Number", 12);
            var noteIndex = isCreateOrderTemplate ? FindColumnIndex(cells, offset, "Ghi chú", 14) : offset + 11;

            return new ImportRow(
                RowNumber: index + 2,
                ImportOrderNumber: null,
                ImportCustomerName: cells.ElementAtOrDefault(customerIndex),
                OrderDate: ParseDate(cells.ElementAtOrDefault(offset)),
                DueDate: ParseDate(cells.ElementAtOrDefault(offset + 1)),
                Status: ParseStatus(cells.ElementAtOrDefault(statusIndex)),
                OnlineOrderFlag: isCreateOrderTemplate ? ParseOnlineOrderFlag(cells.ElementAtOrDefault(onlineFlagIndex)) : true,
                PurchaseOrderNumber: isCreateOrderTemplate ? cells.ElementAtOrDefault(purchaseOrderIndex) : null,
                CustomerId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(customerIndex)) : null,
                SalesPersonId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(FindColumnIndex(cells, offset, "SalesPersonID", 5))) : null,
                TerritoryId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(FindColumnIndex(cells, offset, "TerritoryID", 6))) : null,
                BillToAddressId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(FindColumnIndex(cells, offset, "BillToAddressID", 7))) : null,
                ShipToAddressId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(FindColumnIndex(cells, offset, "ShipToAddressID", 8))) : null,
                ShipMethodId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(FindColumnIndex(cells, offset, "ShipMethodID", 9))) : null,
                ProductId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(productIndex)) : null,
                SpecialOfferId: isCreateOrderTemplate ? ParseNullableInt(cells.ElementAtOrDefault(specialOfferIndex)) : null,
                Quantity: short.TryParse(cells.ElementAtOrDefault(qtyIndex), out var qty) && qty > 0 ? qty : (short)1,
                UnitPrice: decimal.TryParse(cells.ElementAtOrDefault(priceIndex), NumberStyles.Number, CultureInfo.InvariantCulture, out var price) && price >= 0 ? price : 1,
                DiscountPercent: decimal.TryParse(cells.ElementAtOrDefault(discountIndex), NumberStyles.Number, CultureInfo.InvariantCulture, out var discount) ? Math.Clamp(discount, 0, 99) / 100 : 0,
                Tax: decimal.TryParse(cells.ElementAtOrDefault(taxIndex), NumberStyles.Number, CultureInfo.InvariantCulture, out var tax) && tax >= 0 ? tax : 0,
                Freight: decimal.TryParse(cells.ElementAtOrDefault(freightIndex), NumberStyles.Number, CultureInfo.InvariantCulture, out var freight) && freight >= 0 ? freight : 0,
                Comment: cells.ElementAtOrDefault(noteIndex));
        })
            .ToList();
    }

    private static List<string[]> ReadWorkbookRows(string filePath)
    {
        using var workbook = new XLWorkbook(filePath);
        var worksheet = workbook.Worksheets.First();
        var usedRange = worksheet.RangeUsed();
        if (usedRange is null)
        {
            return [];
        }

        var columnCount = Math.Max(12, usedRange.ColumnCount());
        return usedRange.RowsUsed()
            .Skip(1)
            .Select(row => Enumerable.Range(1, columnCount)
                .Select(column => row.Cell(column).GetFormattedString().Trim())
                .ToArray())
            .Where(cells => cells.Length >= 12 && cells.Any(cell => !string.IsNullOrWhiteSpace(cell)))
            .ToList();
    }

    private static async Task<List<string[]>> ReadTextRowsAsync(string filePath)
    {
        var content = await File.ReadAllTextAsync(filePath, CancellationToken.None);
        var tableRows = Regex.Matches(content, "<tr[^>]*>(.*?)</tr>", RegexOptions.IgnoreCase | RegexOptions.Singleline)
            .Select(match => Regex.Matches(match.Groups[1].Value, "<t[dh][^>]*>(.*?)</t[dh]>", RegexOptions.IgnoreCase | RegexOptions.Singleline)
                .Select(cell => WebUtility.HtmlDecode(Regex.Replace(cell.Groups[1].Value, "<.*?>", string.Empty)).Trim())
                .ToArray())
            .Where(cells => cells.Length >= 12)
            .Skip(1)
            .ToList();

        if (tableRows.Count > 0)
        {
            return tableRows;
        }

        return content.Split('\n')
            .Select(line => line.Trim())
            .Where(line => line.Length > 0)
            .Select(line => line.Split(',').Select(cell => cell.Trim().Trim('"')).ToArray())
            .Where(cells => cells.Length >= 12)
            .Skip(1)
            .ToList();
    }

    private async Task<ImportDefaults> LoadDefaultsAsync()
    {
        var customer = await context.Customers.AsNoTracking().OrderBy(x => x.CustomerId).FirstAsync();
        var addressId = await context.Addresses.AsNoTracking().OrderBy(x => x.AddressId).Select(x => x.AddressId).FirstAsync();
        var shipMethodId = await context.ShipMethods.AsNoTracking().OrderBy(x => x.ShipMethodId).Select(x => x.ShipMethodId).FirstAsync();
        var pair = await context.SpecialOfferProducts.AsNoTracking().OrderBy(x => x.ProductId).Select(x => new { x.ProductId, x.SpecialOfferId }).FirstAsync();

        return new ImportDefaults(customer.CustomerId, customer.TerritoryId, addressId, shipMethodId, pair.ProductId, pair.SpecialOfferId);
    }

    private static SalesOrderHeader BuildOrder(ImportRow row, ImportDefaults defaults)
    {
        var lineTotal = row.Quantity * row.UnitPrice * (1 - row.DiscountPercent);
        var subtotal = lineTotal;
        var now = DateTime.UtcNow;
        var importOrderTime = now.AddSeconds(row.RowNumber);

        return new SalesOrderHeader
        {
            RevisionNumber = 0,
            OrderDate = row.OrderDate,
            DueDate = row.DueDate < row.OrderDate ? row.OrderDate.AddDays(7) : row.DueDate,
            Status = row.Status,
            OnlineOrderFlag = row.OnlineOrderFlag,
            PurchaseOrderNumber = Truncate(row.PurchaseOrderNumber, 25),
            CustomerId = row.CustomerId ?? defaults.CustomerId,
            SalesPersonId = row.SalesPersonId,
            TerritoryId = row.TerritoryId ?? defaults.TerritoryId,
            BillToAddressId = row.BillToAddressId ?? defaults.AddressId,
            ShipToAddressId = row.ShipToAddressId ?? defaults.AddressId,
            ShipMethodId = row.ShipMethodId ?? defaults.ShipMethodId,
            SubTotal = subtotal,
            TaxAmt = row.Tax,
            Freight = row.Freight,
            Comment = BuildImportComment(row.ImportCustomerName, row.Comment),
            Rowguid = Guid.NewGuid(),
            ModifiedDate = importOrderTime,
            SalesOrderDetails =
            {
                new SalesOrderDetail
                {
                    OrderQty = row.Quantity,
                    ProductId = row.ProductId ?? defaults.ProductId,
                    SpecialOfferId = row.SpecialOfferId ?? defaults.SpecialOfferId,
                    UnitPrice = row.UnitPrice,
                    UnitPriceDiscount = row.DiscountPercent,
                    Rowguid = Guid.NewGuid(),
                    ModifiedDate = now
                }
            }
        };
    }

    private static bool LooksLikeImportOrderNumber(string? value) =>
        !string.IsNullOrWhiteSpace(value) && Regex.IsMatch(value.Trim(), @"^SO[-\w]*\d+$", RegexOptions.IgnoreCase);

    private static int? ParseNullableInt(string? value) =>
        int.TryParse(value?.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed) && parsed > 0 ? parsed : null;

    private static int FindColumnIndex(string[] cells, int offset, string marker, int fallbackRelativeIndex)
    {
        var markerIndex = Array.FindIndex(cells, cell => cell.Contains(marker, StringComparison.OrdinalIgnoreCase));
        return markerIndex >= 0 ? markerIndex : offset + fallbackRelativeIndex;
    }

    private static bool ParseOnlineOrderFlag(string? value)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        if (normalized is "0" or "o" or "false" or "offline" or "không" or "khong" or "no" or "n" or "bán trực tiếp" or "ban truc tiep")
        {
            return false;
        }

        return normalized is null or "" or "1" or "true" or "online" or "có" or "co" or "yes" or "y" or "đơn online" or "don online";
    }

    private static string BuildImportComment(string? customerName, string? note)
    {
        var normalizedCustomer = string.IsNullOrWhiteSpace(customerName) ? null : customerName.Trim();
        var normalizedNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        var comment = normalizedCustomer is null
            ? $"Import Excel | Ghi chú: {normalizedNote ?? string.Empty}"
            : $"Import Excel | Khách hàng: {normalizedCustomer} | Ghi chú: {normalizedNote ?? string.Empty}";

        return Truncate(comment, 128) ?? "Import Excel";
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }

    private static DateTime ParseDate(string? value) =>
        DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var date) ? date : DateTime.UtcNow;

    private static byte ParseStatus(string? value) => value?.Trim() switch
    {
        "Đã duyệt" => 2,
        "Tồn kho sau" => 3,
        "Bị từ chối" => 4,
        "Đã giao" => 5,
        "Đã hủy" => 6,
        _ => 1
    };

    private sealed record ImportRow(int RowNumber, string? ImportOrderNumber, string? ImportCustomerName, DateTime OrderDate, DateTime DueDate, byte Status, bool OnlineOrderFlag, string? PurchaseOrderNumber, int? CustomerId, int? SalesPersonId, int? TerritoryId, int? BillToAddressId, int? ShipToAddressId, int? ShipMethodId, int? ProductId, int? SpecialOfferId, short Quantity, decimal UnitPrice, decimal DiscountPercent, decimal Tax, decimal Freight, string? Comment);
    private sealed record ImportDefaults(int CustomerId, int? TerritoryId, int AddressId, int ShipMethodId, int ProductId, int SpecialOfferId);
}
