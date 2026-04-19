namespace CAAdventureWorks.Application.Common.Interfaces;

public interface IIdentityService
{
    string? GetUserId();

    string? GetUserName();

    bool IsInRole(string role);
}
