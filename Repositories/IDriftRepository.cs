using System.Collections.Generic;
using System.Threading.Tasks;
using EnvironmentDriftDetector.Models;

namespace EnvironmentDriftDetector.Repositories
{
    public interface IDriftRepository
    {
        Task<IEnumerable<DriftDetail>> GetAllAsync();
        Task<DriftDetail?> GetByIdAsync(int id);
        Task<DriftDetail> AddAsync(DriftDetail driftDetail);
        Task UpdateAsync(DriftDetail driftDetail);
        Task DeleteAsync(int id);
    }
}
