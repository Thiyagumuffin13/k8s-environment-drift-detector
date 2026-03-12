using System.Collections.Generic;
using System.Threading.Tasks;
using EnvironmentDriftDetector.Models;

namespace EnvironmentDriftDetector.Services
{
    public interface IDriftService
    {
        Task<IEnumerable<DriftDetail>> GetAllDriftsAsync();
        Task<DriftDetail?> GetDriftByIdAsync(int id);
        Task<DriftDetail> CreateDriftAsync(DriftDetail driftDetail);
        Task UpdateDriftAsync(DriftDetail driftDetail);
        Task DeleteDriftAsync(int id);
    }
}
