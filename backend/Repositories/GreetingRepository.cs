namespace EnvironmentDriftDetector.Repositories;

public class GreetingRepository : IGreetingRepository
{
    public string GetGreeting()
    {
        return "Event drift detector fetched";
    }
}
