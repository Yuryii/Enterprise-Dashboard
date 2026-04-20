using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Application.Common.Models;
using CAAdventureWorks.Web.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CAAdventureWorks.Web.Endpoints;

public class Auth : IEndpointGroup
{
    public static string? RoutePrefix => "/api/auth";
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost("/login", Login)
            .WithName("Login")
            .WithTags("Authentication")
            .AllowAnonymous();

        groupBuilder.MapPost("/register", Register)
            .WithName("Register")
            .WithTags("Authentication")
            .RequireAuthorization("Administrator");

        groupBuilder.MapPost("/refresh", RefreshToken)
            .WithName("RefreshToken")
            .WithTags("Authentication")
            .AllowAnonymous();

        groupBuilder.MapPost("/logout", Logout)
            .WithName("Logout")
            .WithTags("Authentication")
            .RequireAuthorization();

        groupBuilder.MapGet("/me", GetCurrentAuthUser)
            .WithName("GetCurrentAuthUser")
            .WithTags("Authentication")
            .RequireAuthorization();

        groupBuilder.MapGet("/roles", GetRoles)
            .WithName("GetRoles")
            .WithTags("Authentication")
            .RequireAuthorization("Administrator");

        groupBuilder.MapGet("/users", GetUsers)
            .WithName("GetUsers")
            .WithTags("Users")
            .RequireAuthorization("Administrator");

        groupBuilder.MapGet("/users/{id}", GetUserById)
            .WithName("GetUserById")
            .WithTags("Users")
            .RequireAuthorization("Administrator");

        groupBuilder.MapPut("/users/{id}/roles", UpdateUserRoles)
            .WithName("UpdateUserRoles")
            .WithTags("Users")
            .RequireAuthorization("Administrator");

        groupBuilder.MapDelete("/users/{id}", DeleteUser)
            .WithName("DeleteUser")
            .WithTags("Users")
            .RequireAuthorization("Administrator");
    }

    public static async Task<IResult> Login(
        [FromBody] LoginRequest request,
        IKeycloakService keycloakService)
    {
        try
        {
            var token = await keycloakService.GetTokenAsync(request.Username, request.Password);
            return TypedResults.Ok(new LoginResponse(
                token.AccessToken,
                token.RefreshToken,
                token.ExpiresIn,
                token.TokenType));
        }
        catch (InvalidOperationException ex)
        {
            return TypedResults.BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Authentication failed",
                Detail = ex.Message
            });
        }
    }

    public static async Task<IResult> Register(
        [FromBody] RegisterRequest request,
        IKeycloakService keycloakService)
    {
        try
        {
            var userId = await keycloakService.CreateUserAsync(new CreateUserRequest(
                request.Username,
                request.Email,
                request.Password,
                true,
                request.Roles));

            if (request.Roles.Length > 0)
                await keycloakService.AssignRolesAsync(userId, request.Roles);

            var user = await keycloakService.GetUserByIdAsync(userId);
            return TypedResults.CreatedAtRoute(user!, "GetUserById", new { id = userId });
        }
        catch (InvalidOperationException ex)
        {
            return TypedResults.BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Registration failed",
                Detail = ex.Message
            });
        }
    }

    public static async Task<IResult> RefreshToken(
        [FromBody] RefreshTokenRequest request,
        IKeycloakService keycloakService)
    {
        try
        {
            var token = await keycloakService.RefreshTokenAsync(request.RefreshToken);
            return TypedResults.Ok(new LoginResponse(
                token.AccessToken,
                token.RefreshToken,
                token.ExpiresIn,
                token.TokenType));
        }
        catch (InvalidOperationException ex)
        {
            return TypedResults.BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Token refresh failed",
                Detail = ex.Message
            });
        }
    }

    public static async Task<IResult> Logout(
        [FromBody] RefreshTokenRequest request,
        IKeycloakService keycloakService)
    {
        await keycloakService.LogoutAsync(request.RefreshToken);
        return TypedResults.NoContent();
    }

    public static IResult GetCurrentAuthUser(IUser user)
    {
        if (user.Id == null)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(new { user.Id, user.UserName, user.Roles });
    }

    public static async Task<IResult> GetRoles(IKeycloakService keycloakService)
    {
        var roles = await keycloakService.GetRealmRolesAsync();
        return TypedResults.Ok(roles);
    }

    public static async Task<IResult> GetUsers(
        [FromQuery] int? first,
        [FromQuery] int? max,
        IKeycloakService keycloakService)
    {
        var users = await keycloakService.GetUsersAsync(first, max);
        return TypedResults.Ok(users);
    }

    public static async Task<IResult> GetUserById(string id, IKeycloakService keycloakService)
    {
        var user = await keycloakService.GetUserByIdAsync(id);
        return user is not null
            ? TypedResults.Ok(user)
            : TypedResults.NotFound();
    }

    public static async Task<IResult> UpdateUserRoles(
        string id,
        [FromBody] string[] roles,
        IKeycloakService keycloakService)
    {
        await keycloakService.AssignRolesAsync(id, roles);
        return TypedResults.NoContent();
    }

    public static async Task<IResult> DeleteUser(string id, IKeycloakService keycloakService)
    {
        await keycloakService.DeleteUserAsync(id);
        return TypedResults.NoContent();
    }
}
