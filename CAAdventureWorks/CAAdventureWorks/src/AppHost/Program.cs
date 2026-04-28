using Aspire.Hosting.Docker;
using Aspire.Hosting.Keycloak;
using CAAdventureWorks.Shared;

var builder = DistributedApplication.CreateBuilder(args);

// Keycloak - import realm from realm-export.json
var keycloak = builder.AddKeycloak("keycloak", 8080)
    .WithEnvironment("KC_BOOTSTRAP_ADMIN_USERNAME", "admin")
    .WithEnvironment("KC_BOOTSTRAP_ADMIN_PASSWORD", "admin")
    .WithEnvironment("KC_SPI_THEME_CACHE_THEMES", "false")
    .WithEnvironment("KC_SPI_THEME_CACHE_TEMPLATES", "false")
    .WithBindMount("keycloak/themes", "/opt/keycloak/themes")
    .WithRealmImport("keycloak/realm-export.json");

// Web API - connects to Keycloak managed by Aspire
var web = builder.AddProject<Projects.Web>(Services.WebApi)
    .WithReference(keycloak)
    .WaitFor(keycloak)
    .WithExternalHttpEndpoints()
    .WithAspNetCoreEnvironment()
    .WithUrlForEndpoint("http", url =>
    {
        url.DisplayText = "Scalar API Reference";
        url.Url = "/scalar";
    });

// Angular Frontend
var frontend = builder.AddJavaScriptApp(Services.WebFrontend, "../WebFrontend", "start")
    .WithReference(web)
    .WaitFor(web)
    .WithExternalHttpEndpoints()
    .WithHttpEndpoint(env: "PORT")
    .WithEnvironment("apiBaseUrl", web.GetEndpoint("http"))
    .WithEnvironment("keycloakUrl", $"{keycloak.GetEndpoint("http")}/realms/CAAdventureWorks")
    .WithEnvironment(context =>
    {
        context.EnvironmentVariables["NG_CLI_ANALYTICS"] = "false";
    });

builder.Build().Run();
//                       _oo0oo_
//                      o8888888o
//                      88" . "88
//                      (| -_- |)
//                      0\  =  /0
//                    ___/`---'\___
//                  .' \\|     |// '.
//                 / \\|||  :  |||// \
//                / _||||| -:- |||||- \
//               |   | \\\  -  /// |   |
//               | \_|  ''\---/''  |_/ |
//               \  .-\__  '-'  ___/-. /
//             ___'. .'  /--.--\  `. .'___
//          ."" '<  `.___\_<|>_/___.' >' "".
//         | | :  `- \`.;`\ _ /`;.`/ - ` : | |
//         \  \ `_.   \_ __\ /__ _/   .-` /  /
//     =====`-.____`.___ \_____/___.-`___.-'=====
//                       `=---='
//
//     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//            Phật phù hộ, không bao giờ BUG
//     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Chúng con chỉ còn 60 phút thôi ạ, xin hãy phù hộ cho chúng con hoàn thành tốt đẹp phần demo này,
// không bị lỗi gì nghiêm trọng xảy ra. Chúng con cảm tạ ơn trên đã luôn che chở và bảo vệ chúng con trong suốt thời gian qua.
// Nam mô A di đà phật!
