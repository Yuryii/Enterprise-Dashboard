using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.Common.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CAAdventureWorks.Infrastructure.Identity;

public class KeycloakService : IKeycloakService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<KeycloakService> _logger;

    private string? _adminAccessToken;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public KeycloakService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<KeycloakService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    private string Authority => _configuration["Keycloak:Authority"]
        ?? "http://localhost:8080/realms/AdventureWorks";

    private string Realm => ExtractRealm(Authority);

    private string TokenEndpoint => $"{Authority}/protocol/openid-connect/token";
    private string AdminEndpoint => $"{Authority[..Authority.LastIndexOf("/realms/")]}";

    private static string ExtractRealm(string authority)
    {
        var idx = authority.LastIndexOf("/realms/", StringComparison.Ordinal);
        return idx >= 0 ? authority[(idx + "/realms/".Length)..] : "master";
    }

    #region Token Operations

    public async Task<TokenResponse> GetTokenAsync(string username, string password)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"] = _configuration["Keycloak:ClientId"] ?? "adventureworks-api",
            ["client_secret"] = _configuration["Keycloak:ClientSecret"] ?? "",
            ["username"] = username,
            ["password"] = password
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Keycloak token request failed: {StatusCode} - {Body}",
                response.StatusCode, json);
            throw new InvalidOperationException($"Failed to get token: {response.StatusCode}");
        }

        return ParseTokenResponse(json);
    }

    public async Task<TokenResponse> RefreshTokenAsync(string refreshToken)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = _configuration["Keycloak:ClientId"] ?? "adventureworks-api",
            ["client_secret"] = _configuration["Keycloak:ClientSecret"] ?? "",
            ["refresh_token"] = refreshToken
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Keycloak refresh token request failed: {StatusCode} - {Body}",
                response.StatusCode, json);
            throw new InvalidOperationException($"Failed to refresh token: {response.StatusCode}");
        }

        return ParseTokenResponse(json);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _configuration["Keycloak:ClientId"] ?? "adventureworks-api",
            ["client_secret"] = _configuration["Keycloak:ClientSecret"] ?? "",
            ["refresh_token"] = refreshToken
        });

        var response = await _httpClient.PostAsync($"{TokenEndpoint}/logout", content);
        if (!response.IsSuccessStatusCode)
        {
            var json = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("Keycloak logout request failed: {StatusCode} - {Body}",
                response.StatusCode, json);
        }
    }

    private static TokenResponse ParseTokenResponse(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return new TokenResponse(
            AccessToken: root.GetProperty("access_token").GetString() ?? "",
            RefreshToken: root.GetProperty("refresh_token").GetString() ?? "",
            ExpiresIn: root.GetProperty("expires_in").GetInt32(),
            TokenType: root.GetProperty("token_type").GetString() ?? "Bearer");
    }

    #endregion

    #region Admin API Operations

    private async Task EnsureAdminTokenAsync()
    {
        if (!string.IsNullOrEmpty(_adminAccessToken)) return;

        var adminClientId = _configuration["Keycloak:AdminClientId"] ?? "admin-cli";
        var adminUsername = _configuration["Keycloak:AdminUsername"] ?? "admin";
        var adminPassword = _configuration["Keycloak:AdminPassword"] ?? "admin";

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"] = adminClientId,
            ["username"] = adminUsername,
            ["password"] = adminPassword
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Keycloak admin token request failed: {StatusCode} - {Body}",
                response.StatusCode, json);
            throw new InvalidOperationException("Failed to obtain Keycloak admin token");
        }

        _adminAccessToken = ParseTokenResponse(json).AccessToken;
    }

    private async Task<string> EnsureAdminTokenWithSecretAsync()
    {
        if (!string.IsNullOrEmpty(_adminAccessToken)) return _adminAccessToken;

        var adminClientId = _configuration["Keycloak:AdminClientId"] ?? "admin-cli";
        var adminClientSecret = _configuration["Keycloak:AdminClientSecret"] ?? "";
        var adminUsername = _configuration["Keycloak:AdminUsername"] ?? "admin";
        var adminPassword = _configuration["Keycloak:AdminPassword"] ?? "admin";

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"] = adminClientId,
            ["client_secret"] = adminClientSecret,
            ["username"] = adminUsername,
            ["password"] = adminPassword
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Keycloak admin token request failed: {StatusCode} - {Body}",
                response.StatusCode, json);
            throw new InvalidOperationException("Failed to obtain Keycloak admin token");
        }

        _adminAccessToken = ParseTokenResponse(json).AccessToken;
        return _adminAccessToken;
    }

    private async Task EnsureAdminTokenAsync(string clientId, string clientSecret, string username, string password)
    {
        if (!string.IsNullOrEmpty(_adminAccessToken)) return;

        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["username"] = username,
            ["password"] = password
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Keycloak admin token request failed: {StatusCode} - {Body}",
                response.StatusCode, json);
            throw new InvalidOperationException("Failed to obtain Keycloak admin token");
        }

        _adminAccessToken = ParseTokenResponse(json).AccessToken;
    }

    private void ClearAdminToken() => _adminAccessToken = null;

    private async Task<HttpRequestMessage> CreateAdminRequestAsync(HttpMethod method, string path)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var request = new HttpRequestMessage(method, $"{AdminEndpoint}{path}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private async Task<string> GetEffectiveAdminTokenAsync()
    {
        var clientId = _configuration["Keycloak:AdminClientId"] ?? "admin-cli";
        var clientSecret = _configuration["Keycloak:AdminClientSecret"] ?? "";
        var username = _configuration["Keycloak:AdminUsername"] ?? "admin";
        var password = _configuration["Keycloak:AdminPassword"] ?? "admin";

        if (!string.IsNullOrEmpty(clientSecret))
        {
            if (_adminAccessToken == null)
                _adminAccessToken = await GetAdminTokenWithClientSecretAsync(clientId, clientSecret);
            return _adminAccessToken;
        }

        if (_adminAccessToken == null)
            await EnsureAdminTokenAsync(clientId, clientSecret, username, password);
        return _adminAccessToken!;
    }

    private async Task<string> GetAdminTokenWithClientSecretAsync(string clientId, string clientSecret)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret
        });

        var response = await _httpClient.PostAsync(TokenEndpoint, content);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Keycloak admin client credentials token failed: {StatusCode} - {Body}",
                response.StatusCode, json);
            throw new InvalidOperationException("Failed to obtain Keycloak admin token via client credentials");
        }

        return ParseTokenResponse(json).AccessToken;
    }

    public async Task<string> CreateUserAsync(CreateUserRequest request)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/users";

        var payload = new
        {
            username = request.Username,
            email = request.Email,
            enabled = true,
            emailVerified = request.EmailVerified,
            credentials = new[]
            {
                new
                {
                    type = "password",
                    value = request.Password,
                    temporary = false
                }
            }
        };

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(requestMessage);

        if (response.StatusCode == System.Net.HttpStatusCode.Conflict)
            throw new InvalidOperationException($"User '{request.Username}' already exists.");

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Create user failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to create user: {response.StatusCode}");
        }

        var location = response.Headers.Location?.ToString();
        if (!string.IsNullOrEmpty(location))
        {
            var uri = new Uri(location);
            return uri.Segments.Last();
        }

        var users = await GetUsersAsync();
        return users.First(u => u.Username == request.Username).Id;
    }

    public async Task<UserDto?> GetUserByIdAsync(string id)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/users/{id}";

        var requestMessage = new HttpRequestMessage(HttpMethod.Get, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };

        var response = await _httpClient.SendAsync(requestMessage);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound) return null;

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Get user failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to get user: {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return ParseKeycloakUser(json);
    }

    public async Task<IEnumerable<UserDto>> GetUsersAsync(int? first = null, int? max = null)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var query = BuildQueryParams(("first", first), ("max", max));
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/users{query}";

        var requestMessage = new HttpRequestMessage(HttpMethod.Get, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };

        var response = await _httpClient.SendAsync(requestMessage);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Get users failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to get users: {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return ParseKeycloakUsers(json);
    }

    public async Task UpdateUserAsync(string id, UpdateUserRequest request)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/users/{id}";

        var payload = new
        {
            email = request.Email,
            emailVerified = request.EmailVerified,
            firstName = request.FirstName,
            lastName = request.LastName
        };

        var requestMessage = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(requestMessage);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Update user failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to update user: {response.StatusCode}");
        }
    }

    public async Task DeleteUserAsync(string id)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/users/{id}";

        var requestMessage = new HttpRequestMessage(HttpMethod.Delete, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };

        var response = await _httpClient.SendAsync(requestMessage);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Delete user failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to delete user: {response.StatusCode}");
        }
    }

    public async Task AssignRolesAsync(string userId, IEnumerable<string> roles)
    {
        var token = await GetEffectiveAdminTokenAsync();
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/users/{userId}/role-mappings/realm";

        var rolePayload = roles.Select(r => new { name = r }).ToArray();

        var requestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) },
            Content = new StringContent(JsonSerializer.Serialize(rolePayload, JsonOptions), Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(requestMessage);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Assign roles failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to assign roles: {response.StatusCode}");
        }
    }

    public async Task<IEnumerable<RoleDto>> GetRealmRolesAsync()
    {
        var token = await GetEffectiveAdminTokenAsync();
        var url = $"{AdminEndpoint}/admin/realms/{Realm}/roles";

        var requestMessage = new HttpRequestMessage(HttpMethod.Get, url)
        {
            Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
        };

        var response = await _httpClient.SendAsync(requestMessage);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("Get realm roles failed: {StatusCode} - {Body}", response.StatusCode, body);
            throw new InvalidOperationException($"Failed to get realm roles: {response.StatusCode}");
        }

        var json = await response.Content.ReadAsStringAsync();
        return ParseKeycloakRoles(json);
    }

    public async Task<bool> UserExistsAsync(string username)
    {
        try
        {
            var token = await GetEffectiveAdminTokenAsync();
            var url = $"{AdminEndpoint}/admin/realms/{Realm}/users?username={Uri.EscapeDataString(username)}&exact=true";

            var requestMessage = new HttpRequestMessage(HttpMethod.Get, url)
            {
                Headers = { Authorization = new AuthenticationHeaderValue("Bearer", token) }
            };

            var response = await _httpClient.SendAsync(requestMessage);
            if (!response.IsSuccessStatusCode) return false;

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.GetArrayLength() > 0;
        }
        catch
        {
            return false;
        }
    }

    #endregion

    #region Parsers

    private static UserDto ParseKeycloakUser(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var roles = root.TryGetProperty("realmRoles", out var rr)
            ? [.. rr.EnumerateArray().Select(r => r.GetString()).Where(s => s != null)!]
            : Array.Empty<string>();

        return new UserDto(
            Id: root.GetProperty("id").GetString() ?? "",
            Username: root.GetProperty("username").GetString() ?? "",
            Email: root.GetProperty("email").GetString() ?? "",
            Roles: roles);
    }

    private static IEnumerable<UserDto> ParseKeycloakUsers(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.EnumerateArray().Select(el =>
        {
            var roles = el.TryGetProperty("realmRoles", out var rr)
                ? [.. rr.EnumerateArray().Select(r => r.GetString()).Where(s => s != null)!]
                : Array.Empty<string>();

            return new UserDto(
                Id: el.GetProperty("id").GetString() ?? "",
                Username: el.GetProperty("username").GetString() ?? "",
                Email: el.GetProperty("email").GetString() ?? "",
                Roles: roles);
        });
    }

    private static IEnumerable<RoleDto> ParseKeycloakRoles(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.EnumerateArray().Select(el => new RoleDto(
            Name: el.GetProperty("name").GetString() ?? "",
            Description: el.TryGetProperty("description", out var d) ? d.GetString() ?? "" : ""));
    }

    private static string BuildQueryParams(params (string key, int? value)[] pairs)
    {
        var parts = pairs
            .Where(p => p.value.HasValue)
            .Select(p => $"{p.key}={p.value!.Value}");
        return parts.Any() ? "?" + string.Join("&", parts) : "";
    }

    #endregion
}
