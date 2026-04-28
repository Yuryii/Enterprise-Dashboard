namespace CAAdventureWorks.Application.Common.Interfaces;

public interface IUser
{
    string? Id { get; }

    string? UserName { get; }

    string? Email { get; }

    List<string>? Roles { get; }
}
