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
    public DbSet<SavedChart> SavedCharts => Set<SavedChart>();
    public DbSet<AlertDefinition> AlertDefinitions => Set<AlertDefinition>();
    public DbSet<AlertConfiguration> AlertConfigurations => Set<AlertConfiguration>();
    public DbSet<AlertHistory> AlertHistories => Set<AlertHistory>();
    public DbSet<VendorDebt> VendorDebts => Set<VendorDebt>();
    public DbSet<VendorImportance> VendorImportances => Set<VendorImportance>();
    public DbSet<PaymentPlan> PaymentPlans => Set<PaymentPlan>();

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

        modelBuilder.Entity<SavedChart>(entity =>
        {
            entity.Property(e => e.ChartId).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.DepartmentId);
        });

        modelBuilder.Entity<AlertDefinition>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.DepartmentCode);
        });

        modelBuilder.Entity<AlertConfiguration>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.HasIndex(e => new { e.UserId, e.AlertDefinitionId }).IsUnique();
            entity.HasIndex(e => e.DepartmentCode);
            entity.HasOne(e => e.AlertDefinition)
                  .WithMany(a => a.Configurations)
                  .HasForeignKey(e => e.AlertDefinitionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AlertHistory>(entity =>
        {
            entity.Property(e => e.Id).ValueGeneratedOnAdd();
            entity.HasIndex(e => new { e.AlertConfigurationId, e.TriggeredAt });
            entity.HasIndex(e => new { e.IsRead, e.IsDismissed });
            entity.HasOne(e => e.AlertConfiguration)
                  .WithMany(a => a.Histories)
                  .HasForeignKey(e => e.AlertConfigurationId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.AlertDefinition)
                  .WithMany(a => a.Histories)
                  .HasForeignKey(e => e.AlertDefinitionId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<VendorDebt>(entity =>
        {
            entity.Property(e => e.VendorDebtId).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            entity.Property(e => e.Status).HasConversion<byte>();
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_ChatBot_VendorDebt_Status");
            entity.HasIndex(e => e.Amount).HasDatabaseName("IX_ChatBot_VendorDebt_Amount");
        });

        modelBuilder.Entity<VendorImportance>(entity =>
        {
            entity.Property(e => e.VendorImportanceId).ValueGeneratedOnAdd();
        });

        modelBuilder.Entity<PaymentPlan>(entity =>
        {
            entity.Property(e => e.PaymentPlanId).ValueGeneratedOnAdd();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });
    }
}
