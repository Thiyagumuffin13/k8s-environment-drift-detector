using EnvironmentDriftDetector.Repositories;
using EnvironmentDriftDetector.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Register application layers
builder.Services.AddScoped<IGreetingRepository, GreetingRepository>();
builder.Services.AddScoped<IGreetingService, GreetingService>();

// Configure Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "EnvironmentDriftDetector API v1");
});

}

app.UseHttpsRedirection();

// Map controllers
app.MapControllers();

app.Run();
