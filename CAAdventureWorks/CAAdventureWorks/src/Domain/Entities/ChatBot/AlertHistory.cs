using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("AlertHistory", Schema = "ChatBot")]
[Index("AlertConfigurationId", "TriggeredAt", Name = "IX_ChatBot_AlertHistory_ConfigId_TriggeredAt")]
[Index("IsRead", "IsDismissed", Name = "IX_ChatBot_AlertHistory_IsRead_IsDismissed")]
public class AlertHistory
{
    [Key]
    [Column("AlertHistoryId")]
    public int Id { get; set; }

    [Column("AlertConfigurationId")]
    public int AlertConfigurationId { get; set; }

    [ForeignKey(nameof(AlertConfigurationId))]
    public virtual AlertConfiguration AlertConfiguration { get; set; } = null!;

    [Column("AlertDefinitionId")]
    public int AlertDefinitionId { get; set; }

    [ForeignKey(nameof(AlertDefinitionId))]
    public virtual AlertDefinition AlertDefinition { get; set; } = null!;

    public DateTime TriggeredAt { get; set; }

    public decimal ThresholdValue { get; set; }

    public decimal ActualValue { get; set; }

    [Required]
    [StringLength(2000)]
    public string Message { get; set; } = string.Empty;

    public bool IsRead { get; set; }

    public bool IsDismissed { get; set; }
}
