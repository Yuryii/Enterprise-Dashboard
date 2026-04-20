using CAAdventureWorks.Application.Departments.Commands.CreateDepartment;
using CAAdventureWorks.Application.Departments.Commands.DeleteDepartment;
using CAAdventureWorks.Application.Departments.Commands.UpdateDepartment;
using CAAdventureWorks.Application.Departments.Queries.GetDepartments;
using CAAdventureWorks.Application.Common.Security;
using Microsoft.AspNetCore.Http.HttpResults;

namespace CAAdventureWorks.Web.Endpoints;

public class DepartmentsEndpoint : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapGet(GetDepartments, "/")
            .WithName("GetDepartments")
            .WithTags("Departments");

        groupBuilder.MapGet(GetDepartmentById, "/{id}")
            .WithName("GetDepartmentById")
            .WithTags("Departments")
            .RequireAuthorization("Administrator");

        groupBuilder.MapPost(CreateDepartment, "/")
            .WithName("CreateDepartment")
            .WithTags("Departments")
            .RequireAuthorization("Administrator");

        groupBuilder.MapPut(UpdateDepartment, "/{id}")
            .WithName("UpdateDepartment")
            .WithTags("Departments")
            .RequireAuthorization("Administrator");

        groupBuilder.MapDelete(DeleteDepartment, "/{id}")
            .WithName("DeleteDepartment")
            .WithTags("Departments")
            .RequireAuthorization("Administrator");
    }

    [EndpointSummary("Get all departments")]
    [EndpointDescription("Retrieves a list of all departments ordered by name.")]
    public static async Task<Ok<IReadOnlyList<DepartmentDto>>> GetDepartments(ISender sender)
    {
        var result = await sender.Send(new GetDepartmentsQuery());
        return TypedResults.Ok(result);
    }

    [EndpointSummary("Get department by ID")]
    [EndpointDescription("Retrieves a single department by its ID.")]
    public static async Task<Results<Ok<DepartmentDto>, NotFound>> GetDepartmentById(short id, ISender sender)
    {
        var result = await sender.Send(new GetDepartmentByIdQuery(id));
        return result is not null
            ? TypedResults.Ok(result)
            : TypedResults.NotFound();
    }

    [EndpointSummary("Create a department")]
    [EndpointDescription("Creates a new department with the given name and group.")]
    public static async Task<CreatedAtRoute<DepartmentDto>> CreateDepartment(CreateDepartmentCommand command, ISender sender)
    {
        var id = await sender.Send(command);
        var dto = await sender.Send(new GetDepartmentByIdQuery(id));
        return TypedResults.CreatedAtRoute(dto!, "GetDepartmentById", new { id });
    }

    [EndpointSummary("Update a department")]
    [EndpointDescription("Updates an existing department's name and group.")]
    public static async Task<Results<NoContent, NotFound>> UpdateDepartment(short id, UpdateDepartmentCommand command, ISender sender)
    {
        if (id != command.Id)
            return TypedResults.NotFound();

        try
        {
            await sender.Send(command with { Id = id });
            return TypedResults.NoContent();
        }
        catch
        {
            return TypedResults.NotFound();
        }
    }

    [EndpointSummary("Delete a department")]
    [EndpointDescription("Deletes an existing department by its ID.")]
    public static async Task<Results<NoContent, NotFound>> DeleteDepartment(short id, ISender sender)
    {
        try
        {
            await sender.Send(new DeleteDepartmentCommand(id));
            return TypedResults.NoContent();
        }
        catch
        {
            return TypedResults.NotFound();
        }
    }
}
