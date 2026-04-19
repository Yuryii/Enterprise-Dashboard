using FluentValidation;
using MediatR;

namespace CAAdventureWorks.Application.Departments.Commands.CreateDepartment;

public class CreateDepartmentCommandValidator : AbstractValidator<CreateDepartmentCommand>
{
    public CreateDepartmentCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required.")
            .MaximumLength(50).WithMessage("Name must not exceed 50 characters.");

        RuleFor(x => x.GroupName)
            .NotEmpty().WithMessage("GroupName is required.")
            .MaximumLength(50).WithMessage("GroupName must not exceed 50 characters.");
    }
}
