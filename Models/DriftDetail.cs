using System;

namespace EnvironmentDriftDetector.Models
{
    public class DriftDetail
    {
        public int Id { get; set; }
        public string EnvironmentName { get; set; } = string.Empty;
        public string ResourceName { get; set; } = string.Empty;
        public string DriftType { get; set; } = string.Empty;
        public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
        public bool IsResolved { get; set; } = false;
    }
}
