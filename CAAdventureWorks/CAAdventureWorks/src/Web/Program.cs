using CAAdventureWorks.Infrastructure.Data;
using CAAdventureWorks.Web;
using Hangfire;
using Hangfire.SqlServer;
using Scalar.AspNetCore;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.AddServiceDefaults();

builder.AddKeyVaultIfConfigured();
builder.AddApplicationServices();
builder.AddInfrastructureServices();
builder.AddWebServices();

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(
        builder.Configuration.GetConnectionString("ChatBot"),
        new SqlServerStorageOptions { CommandBatchMaxTimeout = TimeSpan.FromMinutes(5) }
    )
);

builder.Services.AddHangfireServer();

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();
    await initialiser.InitialiseAsync();

    var chatbotInitialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContext2Initialiser>();
    await chatbotInitialiser.InitialiseAsync();
}
else
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseCors(static policy =>
    policy.AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials()
        .SetIsOriginAllowed(_ => true));

app.UseAuthentication();
app.UseAuthorization();

app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireDashboardAuthorizationFilter() }
});

app.MapFallbackToFile("index.html");

app.MapOpenApi();
app.MapScalarApiReference();

app.UseExceptionHandler(options => { });

app.MapGet("/", () => Results.Redirect("/scalar"))
    .WithName("RootRedirect")
    .WithTags("System")
    .ExcludeFromDescription();

// Run the app
app.MapDefaultEndpoints();
app.MapEndpoints(typeof(Program).Assembly);

app.MapHub<CAAdventureWorks.Web.Hubs.ChatBotHub>("/hubs/chatbot");

app.Run();
