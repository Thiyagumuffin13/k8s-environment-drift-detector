using System.Collections.Generic;
using System.Threading.Tasks;
using EnvironmentDriftDetector.Data;
using EnvironmentDriftDetector.Models;
using Microsoft.EntityFrameworkCore;

namespace EnvironmentDriftDetector.Repositories
{
    public class DriftRepository : IDriftRepository
    {
        private readonly AppDbContext _context;

        public DriftRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<DriftDetail>> GetAllAsync()
        {
            return await _context.DriftDetails.ToListAsync();
        }

        public async Task<DriftDetail?> GetByIdAsync(int id)
        {
            return await _context.DriftDetails.FindAsync(id);
        }

        public async Task<DriftDetail> AddAsync(DriftDetail driftDetail)
        {
            _context.DriftDetails.Add(driftDetail);
            await _context.SaveChangesAsync();
            return driftDetail;
        }

        public async Task UpdateAsync(DriftDetail driftDetail)
        {
            _context.Entry(driftDetail).State = EntityState.Modified;
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var driftDetail = await _context.DriftDetails.FindAsync(id);
            if (driftDetail != null)
            {
                _context.DriftDetails.Remove(driftDetail);
                await _context.SaveChangesAsync();
            }
        }
    }
}
