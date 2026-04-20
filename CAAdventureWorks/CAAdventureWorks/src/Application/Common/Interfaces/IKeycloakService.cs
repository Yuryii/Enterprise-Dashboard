using CAAdventureWorks.Application.Common.Models;

namespace CAAdventureWorks.Application.Common.Interfaces;

public interface IKeycloakService
{
    Task<TokenResponse> GetTokenAsync(string username, string password);
    Task<TokenResponse> RefreshTokenAsync(string refreshToken);
    Task LogoutAsync(string refreshToken);

    Task<string> CreateUserAsync(CreateUserRequest request);
    Task<UserDto?> GetUserByIdAsync(string id);
    Task<IEnumerable<UserDto>> GetUsersAsync(int? first = null, int? max = null);
    Task UpdateUserAsync(string id, UpdateUserRequest request);
    Task DeleteUserAsync(string id);
    Task AssignRolesAsync(string userId, IEnumerable<string> roles);
    Task<IEnumerable<RoleDto>> GetRealmRolesAsync();
    Task<bool> UserExistsAsync(string username);
}
