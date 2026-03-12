using System.Collections.Generic;
using System.Threading.Tasks;
using EnvironmentDriftDetector.Models;
using EnvironmentDriftDetector.Repositories;

namespace EnvironmentDriftDetector.Services
{
    public class DriftService : IDriftService
    {
        private readonly IDriftRepository _driftRepository;

        public DriftService(IDriftRepository driftRepository)
        {
            _driftRepository = driftRepository;
        }

        public async Task<IEnumerable<DriftDetail>> GetAllDriftsAsync()
        {
            return await _driftRepository.GetAllAsync();
        }

        public async Task<DriftDetail?> GetDriftByIdAsync(int id)
        {
            return await _driftRepository.GetByIdAsync(id);
        }

        public async Task<DriftDetail> CreateDriftAsync(DriftDetail driftDetail)
        {
            return await _driftRepository.AddAsync(driftDetail);
        }

        public async Task UpdateDriftAsync(DriftDetail driftDetail)
        {
            await _driftRepository.UpdateAsync(driftDetail);
        }

        public async Task DeleteDriftAsync(int id)
        {
            await _driftRepository.DeleteAsync(id);
        }
    }
}
