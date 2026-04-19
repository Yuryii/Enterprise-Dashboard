using CAAdventureWorks.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace CAAdventureWorks.Web.Endpoints;

public class Users : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet((IUser user) =>
        {
            if (user.Id == null)
                return (IResult)TypedResults.Unauthorized();

            return TypedResults.Ok(new { user.Id, user.UserName, user.Roles });
        }, "/me")
        .WithName("GetCurrentUser")
        .WithTags("Users")
        .RequireAuthorization();
    }
}
