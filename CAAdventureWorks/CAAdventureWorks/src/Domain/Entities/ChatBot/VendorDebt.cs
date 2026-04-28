using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

public enum DebtStatus
{
    Pending = 0,
    Paid = 1,
    Deferred = 2
}

[Table("VendorDebt", Schema = "ChatBot")]
public class VendorDebt
{
    [Key]
    [Column("VendorDebtId")]
    public int VendorDebtId { get; set; }

    [Required]
    [StringLength(256)]
    public string VendorName { get; set; } = string.Empty;

    [Required]
    [StringLength(64)]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(256)]
    public string VendorEmail { get; set; } = string.Empty;

    [Required]
    [Column(TypeName = "money")]
    public decimal Amount { get; set; }

    [Required]
    [Range(1, 100)]
    public int ImportanceScore { get; set; }

    [Required]
    [StringLength(128)]
    public string Category { get; set; } = string.Empty;

    [Required]
    public DateTime DueDate { get; set; }

    [Required]
    public DebtStatus Status { get; set; } = DebtStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? PaidAt { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
