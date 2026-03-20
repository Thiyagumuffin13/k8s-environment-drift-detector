using EnvironmentDriftDetector.Repositories;
using EnvironmentDriftDetector.Services;
using EnvironmentDriftDetector.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Register application layers
builder.Services.AddScoped<IGreetingRepository, GreetingRepository>();
builder.Services.AddScoped<IGreetingService, GreetingService>();

// Register Database Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register Drift Service and Repository
builder.Services.AddScoped<IDriftRepository, DriftRepository>();
builder.Services.AddScoped<IDriftService, DriftService>();

// Configure CORS for Angular frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",   // Angular dev server
                "http://localhost:80",      // Angular Docker container
                "http://localhost"          // Nginx in Docker
            )
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

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

// Enable CORS - must be before UseHttpsRedirection and MapControllers
app.UseCors("AllowAngularFrontend");

// Automatic migrations on startup with Retry Logic
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var dbContext = services.GetRequiredService<AppDbContext>();

        // Retry logic for applying migrations (useful for Docker when Postgres is still starting)
        var retries = 5;
        while (retries > 0)
        {
            try
            {
                logger.LogInformation($"Attempting to apply migrations... ({retries} retries left)");
                dbContext.Database.Migrate();
                logger.LogInformation("Database migrations applied successfully.");
                break;
            }
            catch (Exception ex)
            {
                retries--;
                logger.LogWarning(ex, $"Failed to connect to database. Retrying... {retries} retries left.");
                if (retries == 0) throw;
                System.Threading.Thread.Sleep(5000); // wait 5 seconds before retrying
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating the database.");
        throw; // Let the container crash if we absolutely cannot connect after all retries
    }
}

app.UseHttpsRedirection();

// Map controllers
app.MapControllers();

app.Run();
