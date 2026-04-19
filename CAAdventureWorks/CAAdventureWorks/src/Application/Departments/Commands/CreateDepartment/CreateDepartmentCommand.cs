using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities;
using MediatR;

namespace CAAdventureWorks.Application.Departments.Commands.CreateDepartment;

public record CreateDepartmentCommand(string Name, string GroupName) : IRequest<short>;

public class CreateDepartmentCommandHandler(IApplicationDbContext context)
    : IRequestHandler<CreateDepartmentCommand, short>
{
    public async Task<short> Handle(CreateDepartmentCommand request, CancellationToken cancellationToken)
    {
        var department = new Department
        {
            Name = request.Name,
            GroupName = request.GroupName,
            ModifiedDate = DateTime.Now
        };

        context.Departments.Add(department);
        await context.SaveChangesAsync(cancellationToken);

        return department.DepartmentId;
    }
}
