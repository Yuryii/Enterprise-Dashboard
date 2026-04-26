using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("AlertDefinition", Schema = "ChatBot")]
[Index("Code", Name = "IX_ChatBot_AlertDefinition_Code", IsUnique = true)]
[Index("DepartmentCode", Name = "IX_ChatBot_AlertDefinition_DepartmentCode")]
public class AlertDefinition
{
    [Key]
    [Column("AlertDefinitionId")]
    public int Id { get; set; }

    [Required]
    [StringLength(64)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(256)]
    public string Name { get; set; } = string.Empty;

    [StringLength(512)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [StringLength(64)]
    public string DepartmentCode { get; set; } = string.Empty;

    public decimal? DefaultThreshold { get; set; }

    [StringLength(32)]
    public string ThresholdUnit { get; set; } = "Percent";

    public bool RequiresParameters { get; set; }

    [StringLength(4000)]
    public string QueryTemplate { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    [InverseProperty(nameof(AlertConfiguration.AlertDefinition))]
    public virtual ICollection<AlertConfiguration> Configurations { get; set; } = new List<AlertConfiguration>();

    [InverseProperty(nameof(AlertHistory.AlertDefinition))]
    public virtual ICollection<AlertHistory> Histories { get; set; } = new List<AlertHistory>();
}
