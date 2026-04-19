using Microsoft.AspNetCore.Mvc;
using EnterpriseDashboard.Core.Models;

namespace EnterpriseDashboard.WebApp.Components
{
    public class PagerViewComponent : ViewComponent
    {
        public Task<IViewComponentResult> InvokeAsync(PagedResultBase result)
        {
            return Task.FromResult((IViewComponentResult)View("Default", result));
        }
    }
}
