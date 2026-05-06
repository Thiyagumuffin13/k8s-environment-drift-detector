using EnvironmentDriftDetector.Data;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace EnvironmentDriftDetector.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly AppDbContext _dbContext;

        public HealthController(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        // Keep original endpoint for legacy tests
        [HttpGet]
        public async Task<IActionResult> GetHealth()
        {
            return await CheckDatabaseHealth();
        }

        // LIVENESS: Checks only if the application process is running (Does NOT check the DB)
        // If this fails, Kubernetes kills and restarts the Pod.
        [HttpGet("liveness")]
        public IActionResult GetLiveness()
        {
            return Ok(new { status = "Healthy", message = "App is running" });
        }

        // READINESS: Checks if the app is fully ready for traffic (Checks the DB)
        // If this fails, Kubernetes stops sending traffic to the Pod, but does NOT restart it.
        [HttpGet("readiness")]
        public async Task<IActionResult> GetReadiness()
        {
            return await CheckDatabaseHealth();
        }

        private async Task<IActionResult> CheckDatabaseHealth()
        {
            var isDbConnected = false;
            try
            {
                isDbConnected = await _dbContext.Database.CanConnectAsync();
            }
            catch { }

            if (isDbConnected)
            {
                return Ok(new { status = "Healthy", database = "Connected" });
            }
            else
            {
                return StatusCode(503, new { status = "Unhealthy", database = "Disconnected" });
            }
        }
    }
}
