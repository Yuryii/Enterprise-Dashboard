using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("SavedChart", Schema = "ChatBot")]
[Index("UserId", Name = "IX_ChatBot_SavedChart_UserId")]
[Index("DepartmentId", Name = "IX_ChatBot_SavedChart_DepartmentId")]
public class SavedChart
{
    [Key]
    [Column("ChartId")]
    public Guid ChartId { get; set; }

    [Required]
    [StringLength(256)]
    public string UserId { get; set; } = null!;

    [Required]
    [StringLength(50)]
    public string DepartmentId { get; set; } = null!;

    [Required]
    [StringLength(200)]
    public string Name { get; set; } = null!;

    [Required]
    [Column(TypeName = "nvarchar(max)")]
    public string ChartSpecJson { get; set; } = null!;

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? LastUsedAt { get; set; }
}
