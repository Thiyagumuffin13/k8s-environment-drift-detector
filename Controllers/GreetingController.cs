using EnvironmentDriftDetector.Services;
using Microsoft.AspNetCore.Mvc;

namespace EnvironmentDriftDetector.Controllers;

[ApiController]
[Route("[controller]")]
public class GreetingController : ControllerBase
{
    private readonly IGreetingService _greetingService;

    public GreetingController(IGreetingService greetingService)
    {
        _greetingService = greetingService;
    }

    [HttpGet]
    public IActionResult Get()
    {
        var greeting = _greetingService.GetGreeting();
        return Ok(greeting);
    }
}
