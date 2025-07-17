using ClaimSorted.Helpers;
using ClaimSorted.Models;
using ClaimSorted.Respository;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ClaimSorted.Services
{
    public interface IClaimCalculationService
    {
        Task<int> ProcessAndSaveAsync(ClaimRequest request);

        Task<List<ClaimCalculation>> GetRecentClaimsAsync();

    }
    // Services/ClaimCalculationService.cs
    public class ClaimCalculationService : IClaimCalculationService
    {
        private readonly IClaimRepository _repository;

        public ClaimCalculationService(IClaimRepository repository)
        {
            _repository = repository;
        }

        public async Task<int> ProcessAndSaveAsync(ClaimRequest request)
        {
            var (adjustedItems, breakdown) = ClaimCalculationLogic.Calculate(request);
            var id = await _repository.InsertCalculationAsync(request, adjustedItems, breakdown);
            return id;
        }

        public Task<List<ClaimCalculation>> GetRecentClaimsAsync()
        {
            return _repository.GetRecentClaimsAsync();
        }
    }
}