using CAAdventureWorks.Application.Common.Exceptions;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Departments.Commands.UpdateDepartment;

public record UpdateDepartmentCommand(short Id, string Name, string GroupName) : IRequest;

public class UpdateDepartmentCommandHandler(IApplicationDbContext context)
    : IRequestHandler<UpdateDepartmentCommand>
{
    public async Task Handle(UpdateDepartmentCommand request, CancellationToken cancellationToken)
    {
        var department = await context.Departments
            .FirstOrDefaultAsync(d => d.DepartmentId == request.Id, cancellationToken);

        Guard.Against.NotFound(request.Id, department, "Department");

        department.Name = request.Name;
        department.GroupName = request.GroupName;
        department.ModifiedDate = DateTime.Now;

        await context.SaveChangesAsync(cancellationToken);
    }
}
