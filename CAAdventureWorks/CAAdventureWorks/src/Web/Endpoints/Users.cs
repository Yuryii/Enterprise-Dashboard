using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CAAdventureWorks.Web.Endpoints;

public class Users : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetCurrentUser, "/me")
            .WithName("GetCurrentUser")
            .WithTags("Users")
            .RequireAuthorization();
    }

    [EndpointSummary("Get current user")]
    [EndpointDescription("Retrieves the current authenticated user's information.")]
    public static IResult GetCurrentUser(IUser user)
    {
        if (user.Id == null)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(new { user.Id, user.UserName, user.Roles });
    }
}
