namespace CAAdventureWorks.Application.Departments.Queries.GetDepartments;

public class DepartmentDto
{
    public short Id { get; init; }

    public string Name { get; init; } = null!;

    public string GroupName { get; init; } = null!;

    public DateTimeOffset ModifiedDate { get; init; }
}
