using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace EnterpriseDashboard.Data
{
    public class EnterpriseDashboardContextFactory : IDesignTimeDbContextFactory<EnterpriseDashboardContext>
    {
        public EnterpriseDashboardContext CreateDbContext(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                 .SetBasePath(Directory.GetCurrentDirectory())
                 .AddJsonFile("appsettings.json")
                 .Build();
            var builder = new DbContextOptionsBuilder<EnterpriseDashboardContext>();
            builder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
            return new EnterpriseDashboardContext(builder.Options);
        }
    }
}
