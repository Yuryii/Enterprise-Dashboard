using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Infrastructure.Data;

public class ApplicationDbContext2 : DbContext, IChatBotDbContext
{
    public ApplicationDbContext2(DbContextOptions<ApplicationDbContext2> options)
        : base(options)
    {
    }

    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("ChatBot");

        modelBuilder.Entity<ChatSession>(entity =>
        {
            entity.Property(e => e.SessionId).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.Property(e => e.MessageId).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.Role).HasConversion<byte>();
        });
    }
}
