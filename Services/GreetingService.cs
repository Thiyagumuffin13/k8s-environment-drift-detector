using EnvironmentDriftDetector.Repositories;

namespace EnvironmentDriftDetector.Services;

public class GreetingService : IGreetingService
{
    private readonly IGreetingRepository _greetingRepository;

    public GreetingService(IGreetingRepository greetingRepository)
    {
        _greetingRepository = greetingRepository;
    }

    public string GetGreeting()
    {
        return _greetingRepository.GetGreeting();
    }
}
