using CAAdventureWorks.Application.Common.Exceptions;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Departments.Commands.DeleteDepartment;

public record DeleteDepartmentCommand(short Id) : IRequest;

public class DeleteDepartmentCommandHandler(IApplicationDbContext context)
    : IRequestHandler<DeleteDepartmentCommand>
{
    public async Task Handle(DeleteDepartmentCommand request, CancellationToken cancellationToken)
    {
        var department = await context.Departments
            .FirstOrDefaultAsync(d => d.DepartmentId == request.Id, cancellationToken);

        Guard.Against.NotFound(request.Id, department, "Department");

        context.Departments.Remove(department);
        await context.SaveChangesAsync(cancellationToken);
    }
}
