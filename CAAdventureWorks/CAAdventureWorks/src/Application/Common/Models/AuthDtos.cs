namespace CAAdventureWorks.Application.Common.Models;

public record LoginRequest(string Username, string Password);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string TokenType);

public record RefreshTokenRequest(string RefreshToken);

public record RegisterRequest(
    string Username,
    string Email,
    string Password,
    string[] Roles);

public record UserDto(
    string Id,
    string Username,
    string Email,
    string[] Roles);

public record TokenResponse(
    string AccessToken,
    string RefreshToken,
    int ExpiresIn,
    string TokenType);

public record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    bool EmailVerified,
    string[] Roles);

public record UpdateUserRequest(
    string? Email,
    bool? EmailVerified,
    string? FirstName,
    string? LastName);

public record RoleDto(string Name, string Description);
