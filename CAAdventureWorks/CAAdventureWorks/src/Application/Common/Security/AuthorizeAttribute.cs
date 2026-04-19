namespace CAAdventureWorks.Application.Common.Security;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = true)]
public class AuthorizeAttribute : Attribute
{
    public AuthorizeAttribute() { }

    public AuthorizeAttribute(params string[] roles)
    {
        if (roles.Length > 0)
            Roles = string.Join(",", roles);
    }

    public string Roles { get; set; } = string.Empty;

    public string Policy { get; set; } = string.Empty;
}
