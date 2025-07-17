using ClaimSorted.Models;
using ClaimSorted.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace ClaimSorted
{
    public class ClaimCalculationFunction
    {
        private readonly ILogger _logger;
        private readonly IClaimCalculationService _service;

        public ClaimCalculationFunction(ILoggerFactory loggerFactory, IClaimCalculationService service)
        {
            _logger = loggerFactory.CreateLogger<ClaimCalculationFunction>();
            _service = service;
        }

        [Function("claim-calc")]
        public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
        {
            var requestBody = await new StreamReader(req.Body).ReadToEndAsync();

            var request = JsonSerializer.Deserialize<ClaimRequest>(requestBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (request == null || request.ClaimItems == null || request.ClaimItems.Count == 0)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Invalid input.");
                return bad;
            }

            if (request.ClaimItems.Any(i => i.ClaimedAmount < 0) || request.Excess < 0 || request.CoPayRate < 0)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteStringAsync("Negative values are not allowed.");
                return bad;
            }

            var id = await _service.ProcessAndSaveAsync(request);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteStringAsync($"Calculation saved. Id: {id}");
            return response;
        }
    }
}