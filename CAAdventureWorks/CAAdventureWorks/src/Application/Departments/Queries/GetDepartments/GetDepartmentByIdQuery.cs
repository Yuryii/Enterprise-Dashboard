using AutoMapper;
using CAAdventureWorks.Application.Common.Exceptions;
using CAAdventureWorks.Application.Common.Interfaces;
using CAAdventureWorks.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CAAdventureWorks.Application.Departments.Queries.GetDepartments;

public record GetDepartmentByIdQuery(short Id) : IRequest<DepartmentDto>;

public class GetDepartmentByIdQueryHandler(IApplicationDbContext context, IMapper mapper)
    : IRequestHandler<GetDepartmentByIdQuery, DepartmentDto>
{
    public async Task<DepartmentDto> Handle(GetDepartmentByIdQuery request, CancellationToken cancellationToken)
    {
        var department = await context.Departments
            .FirstOrDefaultAsync(d => d.DepartmentId == request.Id, cancellationToken);

        Guard.Against.NotFound(request.Id, department, "Department");

        return mapper.Map<DepartmentDto>(department);
    }
}
