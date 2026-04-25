using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Domain.Entities.ChatBot;

[Table("ChatMessage", Schema = "ChatBot")]
[Index("SessionId", Name = "IX_ChatBot_ChatMessage_SessionId")]
[Index("CreatedAt", Name = "IX_ChatBot_ChatMessage_CreatedAt")]
public class ChatMessage
{
    [Key]
    [Column("MessageId")]
    public Guid MessageId { get; set; }

    [Column("SessionId")]
    public Guid SessionId { get; set; }

    public ChatMessageRole Role { get; set; }

    [Required]
    public string Content { get; set; } = null!;

    [StringLength(100)]
    public string? Model { get; set; }

    public int? TokensUsed { get; set; }

    [Column(TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column(TypeName = "nvarchar(max)")]
    public string? MetadataJson { get; set; }

    [ForeignKey("SessionId")]
    public virtual ChatSession Session { get; set; } = null!;
}

public enum ChatMessageRole : byte
{
    System = 0,
    User = 1,
    Assistant = 2,
    Tool = 3
}
