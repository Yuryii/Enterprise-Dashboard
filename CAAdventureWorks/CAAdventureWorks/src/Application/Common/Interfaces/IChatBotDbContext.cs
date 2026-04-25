using CAAdventureWorks.Domain.Entities.ChatBot;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Common.Interfaces;

public interface IChatBotDbContext
{
    DbSet<ChatSession> ChatSessions { get; }
    DbSet<ChatMessage> ChatMessages { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
