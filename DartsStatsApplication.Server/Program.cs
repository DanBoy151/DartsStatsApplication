using System.Text.Json.Serialization;
using Marten;
using NSwag;



var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllersWithViews();

builder.Services.AddControllers().AddJsonOptions(opts =>
{
    opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});


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

app.UseCors(policy =>
    policy.WithOrigins("http://localhost") // Use your actual client port
          .AllowAnyHeader()
          .AllowAnyMethod()
);

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();



app.Run();
