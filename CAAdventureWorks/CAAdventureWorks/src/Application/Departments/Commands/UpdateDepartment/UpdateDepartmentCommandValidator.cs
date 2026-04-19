using FluentValidation;
using MediatR;

namespace CAAdventureWorks.Application.Departments.Commands.UpdateDepartment;

public class UpdateDepartmentCommandValidator : AbstractValidator<UpdateDepartmentCommand>
{
    public UpdateDepartmentCommandValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan((short)0).WithMessage("Id must be greater than 0.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(50).WithMessage("Name must not exceed 50 characters.");

        RuleFor(x => x.GroupName)
            .NotEmpty().WithMessage("GroupName is required.")
            .MaximumLength(50).WithMessage("GroupName must not exceed 50 characters.");
    }
}
