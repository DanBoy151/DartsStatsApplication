using System.Text.Json.Serialization;
using DartsStatsApplication.Server.Exceptions;
using DartsStatsApplication.Server.Middleware;
using DartsStatsApplication.Server.Models;
using JasperFx;
using Marten;
using NSwag;



var builder = WebApplication.CreateBuilder(args);

// Enables Marten/JasperFx's native CLI tooling (db-apply, db-assert, etc.) -
// see the RunJasperFxCommands call below. Needs Marten 9.16+; the previous
// 9.15.3 didn't have it, and the separate Marten.CommandLine package that
// used to provide it for older versions turned out incompatible - see git
// history.
builder.Host.ApplyJasperFxExtensions();

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

// Plain liveness check at /healthz - no dependency checks (e.g. DB
// connectivity) yet, just "the process is up and answering requests". Needed
// for any host's readiness probes / zero-downtime deploys / uptime monitors.
builder.Services.AddHealthChecks();


builder.Services.AddMarten(opts =>
{
    opts.Connection(builder.Configuration.GetConnectionString("Database"));

    // Marten normally discovers document types lazily, the first time a
    // controller actually queries/stores one - fine at runtime, but it means
    // an offline tool like `dotnet run -- db-apply` (which never executes
    // any request handler) sees no document types at all and silently
    // "succeeds" at applying nothing. Explicit registration is what gives
    // the CLI tooling something real to work with.
    opts.RegisterDocumentType<Match>();
    opts.RegisterDocumentType<Game>();
    opts.RegisterDocumentType<Leg>();
    opts.RegisterDocumentType<Player>();
    opts.RegisterDocumentType<Team>();
    opts.RegisterDocumentType<Season>();
    opts.RegisterDocumentType<League>();

    // Auto-syncing the schema on every boot is convenient for local dev (and
    // the e2e stack, which always runs Development against a throwaway
    // database), but applying unreviewed schema changes automatically is not
    // something we want happening against a real environment's database.
    // Outside Development, schema changes must be applied deliberately via
    // `dotnet run -- db-apply` (see RunJasperFxCommands below), as an
    // explicit, reviewable deploy step.
    opts.AutoCreateSchemaObjects = builder.Environment.IsDevelopment()
        ? JasperFx.AutoCreate.All
        : JasperFx.AutoCreate.None;
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
// Swagger/OpenAPI is Development-only - it's unnecessary public API surface
// anywhere else.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseOpenApi(); //http://localhost:<port>/swagger/v1/swagger.json
    app.UseSwaggerUi(); //http://localhost:<port>/swagger
}

// Must run early so it can catch exceptions from everything downstream (CORS,
// the API key gate, controllers, etc.). See Exceptions/ApiExceptionHandler.cs.
app.UseExceptionHandler();

app.MapHealthChecks("/healthz");

// Allowed origins come from config (Cors:AllowedOrigins) so dev/docker/prod can
// each declare their own without touching code. Falls back to the dev client
// origin if nothing is configured in Development, so local runs keep working
// out of the box - but the same silent fallback outside Development would
// mean a misconfigured deploy just quietly breaks CORS for the real site
// with no clear error, so that case fails loudly at startup instead.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins is null || allowedOrigins.Length == 0)
{
    if (!app.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("Cors:AllowedOrigins must be configured outside Development.");
    }
    allowedOrigins = new[] { "http://localhost" };
}

app.UseCors(policy =>
    policy.WithOrigins(allowedOrigins)
          .AllowAnyHeader()
          .AllowAnyMethod()
);

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();

// Lightweight API key gate: a no-op until ApiSecurity:ApiKey is configured, so
// this doesn't change behavior until you actually set one. See
// Middleware/ApiKeyMiddleware.cs.
app.UseMiddleware<ApiKeyMiddleware>();

app.UseAuthorization();

app.MapControllers();

return await app.RunJasperFxCommands(args);
