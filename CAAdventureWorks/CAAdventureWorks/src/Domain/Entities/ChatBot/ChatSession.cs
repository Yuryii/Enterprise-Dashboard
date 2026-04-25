using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("ChatSession", Schema = "ChatBot")]
[Index("UserId", Name = "IX_ChatBot_ChatSession_UserId")]
[Index("DepartmentId", Name = "IX_ChatBot_ChatSession_DepartmentId")]
[Index("LastMessageAt", Name = "IX_ChatBot_ChatSession_LastMessageAt")]
public class ChatSession
{
    [Key]
    [Column("SessionId")]
    public Guid SessionId { get; set; }

    [Required]
    [StringLength(50)]
    public string DepartmentId { get; set; } = null!;

    [Required]
    [StringLength(256)]
    public string UserId { get; set; } = null!;

    [StringLength(256)]
    public string? Title { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime? LastMessageAt { get; set; }

    public bool IsActive { get; set; } = true;

    [InverseProperty("Session")]
    public virtual ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
}
