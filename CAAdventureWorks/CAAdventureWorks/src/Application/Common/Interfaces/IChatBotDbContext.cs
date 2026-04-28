using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Common.Interfaces;

public interface IChatBotDbContext
{
    DbSet<ChatSession> ChatSessions { get; }
    DbSet<ChatMessage> ChatMessages { get; }
    DbSet<SavedChart> SavedCharts { get; }
    DbSet<AlertDefinition> AlertDefinitions { get; }
    DbSet<AlertConfiguration> AlertConfigurations { get; }
    DbSet<AlertHistory> AlertHistories { get; }
    DbSet<VendorDebt> VendorDebts { get; }
    DbSet<VendorImportance> VendorImportances { get; }
    DbSet<PaymentPlan> PaymentPlans { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
