using AutoMapper;
using CAAdventureWorks.Application.Common.Interfaces;
using MediatR;

namespace CAAdventureWorks.Application.Departments.Queries.GetDepartments;

public record GetDepartmentsQuery : IRequest<IReadOnlyList<DepartmentDto>>
{
}

public class GetDepartmentsQueryHandler(IApplicationDbContext context, IMapper mapper)
    : IRequestHandler<GetDepartmentsQuery, IReadOnlyList<DepartmentDto>>
{
    public async Task<IReadOnlyList<DepartmentDto>> Handle(GetDepartmentsQuery request, CancellationToken cancellationToken)
    {
        var departments = await context.Departments
            .OrderBy(d => d.Name)
            .ToListAsync(cancellationToken);

        return mapper.Map<IReadOnlyList<DepartmentDto>>(departments);
    }
}
