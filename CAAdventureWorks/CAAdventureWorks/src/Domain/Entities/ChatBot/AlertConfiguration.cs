using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("AlertConfiguration", Schema = "ChatBot")]
[Index("UserId", "AlertDefinitionId", Name = "IX_ChatBot_AlertConfiguration_UserId_AlertDefinitionId", IsUnique = true)]
[Index("DepartmentCode", Name = "IX_ChatBot_AlertConfiguration_DepartmentCode")]
public class AlertConfiguration
{
    [Key]
    [Column("AlertConfigurationId")]
    public int Id { get; set; }

    [Column("AlertDefinitionId")]
    public int AlertDefinitionId { get; set; }

    [ForeignKey(nameof(AlertDefinitionId))]
    public virtual AlertDefinition AlertDefinition { get; set; } = null!;

    [Required]
    [StringLength(256)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [StringLength(64)]
    public string DepartmentCode { get; set; } = string.Empty;

    public bool IsEnabled { get; set; }

    public decimal? ThresholdValue { get; set; }

    public int ScanIntervalDays { get; set; } = 1;

    public int? ScanIntervalSeconds { get; set; }

    [StringLength(1000)]
    public string? ExtraParameters { get; set; }

    public DateTime? LastTriggeredAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    [InverseProperty(nameof(AlertHistory.AlertConfiguration))]
    public virtual ICollection<AlertHistory> Histories { get; set; } = new List<AlertHistory>();
}
