using EnvironmentDriftDetector.Models;
using Microsoft.EntityFrameworkCore;

namespace EnvironmentDriftDetector.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<DriftDetail> DriftDetails { get; set; }
    }
}
