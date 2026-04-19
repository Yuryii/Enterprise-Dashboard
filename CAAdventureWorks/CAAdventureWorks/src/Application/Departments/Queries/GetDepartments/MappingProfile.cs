using AutoMapper;
using CAAdventureWorks.Domain.Entities;

namespace CAAdventureWorks.Application.Departments.Queries.GetDepartments;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Department, DepartmentDto>();
    }
}
