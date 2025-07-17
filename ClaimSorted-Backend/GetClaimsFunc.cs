using ClaimSorted.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Threading.Tasks;

namespace ClaimSorted
{
    public class GetClaimsFunc
    {
        private readonly IClaimCalculationService _service;
        public GetClaimsFunc(ILoggerFactory loggerFactory, IClaimCalculationService claimCalculationService)
        {
            _service = claimCalculationService;
        }

        [Function("GetClaimsFunc")]
        public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "claim-calc")] HttpRequestData req)
        {
            var claims = await _service.GetRecentClaimsAsync();
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(claims);
            return response;
        }
    }
}
