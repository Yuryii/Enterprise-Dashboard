using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("VendorImportance", Schema = "ChatBot")]
public class VendorImportance
{
    [Key]
    [Column("VendorImportanceId")]
    public int VendorImportanceId { get; set; }

    [Required]
    [StringLength(128)]
    public string VendorCategory { get; set; } = string.Empty;

    [Required]
    [Range(1, 100)]
    public int Score { get; set; }

    [Required]
    [StringLength(512)]
    public string Reason { get; set; } = string.Empty;
}
