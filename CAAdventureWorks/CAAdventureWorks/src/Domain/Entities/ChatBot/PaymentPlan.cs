using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("PaymentPlan", Schema = "ChatBot")]
public class PaymentPlan
{
    [Key]
    [Column("PaymentPlanId")]
    public int PaymentPlanId { get; set; }

    [Required]
    public DateTime PlannedDate { get; set; }

    [Required]
    [Column(TypeName = "money")]
    public decimal TotalBudget { get; set; }

    [Required]
    [Column(TypeName = "money")]
    public decimal UsedBudget { get; set; }

    [Required]
    [Column(TypeName = "money")]
    public decimal RemainingBudget { get; set; }

    [Required]
    public int TotalDebtsCount { get; set; }

    [Required]
    public int SelectedDebtsCount { get; set; }

    [Required]
    public int DeferredDebtsCount { get; set; }

    [Required]
    public int TotalImportanceScore { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
