using System.Collections.Generic;
using System.Threading.Tasks;
using EnvironmentDriftDetector.Models;
using EnvironmentDriftDetector.Services;
using Microsoft.AspNetCore.Mvc;

namespace EnvironmentDriftDetector.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DriftController : ControllerBase
    {
        private readonly IDriftService _driftService;

        public DriftController(IDriftService driftService)
        {
            _driftService = driftService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DriftDetail>>> GetAll()
        {
            var drifts = await _driftService.GetAllDriftsAsync();
            return Ok(drifts);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DriftDetail>> GetById(int id)
        {
            var drift = await _driftService.GetDriftByIdAsync(id);
            if (drift == null)
            {
                return NotFound();
            }
            return Ok(drift);
        }

        [HttpPost]
        public async Task<ActionResult<DriftDetail>> Create(DriftDetail drift)
        {
            var createdDrift = await _driftService.CreateDriftAsync(drift);
            return CreatedAtAction(nameof(GetById), new { id = createdDrift.Id }, createdDrift);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, DriftDetail drift)
        {
            if (id != drift.Id)
            {
                return BadRequest();
            }

            await _driftService.UpdateDriftAsync(drift);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            await _driftService.DeleteDriftAsync(id);
            return NoContent();
        }
    }
}
