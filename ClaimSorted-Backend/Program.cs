using ClaimSorted.Respository;
using ClaimSorted.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ClaimSorted
{
    internal class Program
    {
        static void Main(string[] args)
        {
            FunctionsDebugger.Enable();

            var host = new HostBuilder()
                .ConfigureFunctionsWorkerDefaults()
                .ConfigureAppConfiguration(config =>
                {
                    config.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
                    config.AddEnvironmentVariables(); // For Azure deployment
                })
                .ConfigureServices(services =>
                {
                    services.AddSingleton<IClaimRepository, ClaimRepository>();
                    services.AddSingleton<IClaimCalculationService, ClaimCalculationService>();
                })
                .Build();

            host.Run();
        }
    }
}
