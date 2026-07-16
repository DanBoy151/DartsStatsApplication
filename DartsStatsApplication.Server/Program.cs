using System.Text.Json.Serialization;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Middleware;
using Marten;
using NSwag;



var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllersWithViews();

builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Centralized exception handling: replaces the per-action
// catch (Exception ex) { return BadRequest(ex.Message); } blocks. See
// Exceptions/ApiExceptionHandler.cs.
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();


builder.Services.AddMarten(opts =>
{
    opts.Connection(builder.Configuration.GetConnectionString("Database"));
    opts.AutoCreateSchemaObjects = JasperFx.AutoCreate.All;

});

builder.Services.AddOpenApiDocument(options => {
    options.PostProcess = document =>
    {
        document.Info = new OpenApiInfo
        {
            Version = "v1",
            Title = "DartsStats.Server API",
            Description = "An ASP.NET Core Web API for managing Darts team matches & stats"
        };
    };
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
app.MapOpenApi();
app.UseOpenApi(); //http://localhost:<port>/swagger/v1/swagger.json
app.UseSwaggerUi(); //http://localhost:<port>/swagger
//}

// Must run early so it can catch exceptions from everything downstream (CORS,
// the API key gate, controllers, etc.). See Exceptions/ApiExceptionHandler.cs.
app.UseExceptionHandler();

// Allowed origins come from config (Cors:AllowedOrigins) so dev/docker/prod can
// each declare their own without touching code. Falls back to the dev client
// origin if nothing is configured, so local runs keep working out of the box.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[] { "http://localhost" };
}

app.UseCors(policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()
);

app.UseHttpsRedirection();

// Lightweight API key gate: a no-op until ApiSecurity:ApiKey is configured, so
// this doesn't change behavior until you actually set one. See
// Middleware/ApiKeyMiddleware.cs.
app.UseMiddleware<ApiKeyMiddleware>();

app.UseAuthorization();

app.MapControllers();



app.Run();
