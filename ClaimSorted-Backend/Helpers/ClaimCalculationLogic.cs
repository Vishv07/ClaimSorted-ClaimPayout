using ClaimSorted.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace ClaimSorted.Helpers
{
    public static class ClaimCalculationLogic
    {
        private static readonly Dictionary<string, decimal> InnerLimits = new Dictionary<string, decimal>
        {
            { "Medical", 750m },
            { "Electronics", 500m },
            { "Baggage", 400m }
        };

        public static (List<ClaimItem> adjustedItems, ClaimBreakdown breakdown) Calculate(ClaimRequest request)
        {
            var adjustedItems = new List<ClaimItem>();

            foreach (var item in request.ClaimItems)
            {
                var limit = InnerLimits.TryGetValue(item.Category, out var innerLimit) ? innerLimit : 0;
                var adjusted = Math.Min(item.ClaimedAmount, limit);
                adjustedItems.Add(new ClaimItem
                {
                    Category = item.Category,
                    ClaimedAmount = item.ClaimedAmount,
                    AdjustedAmount = adjusted,
                    InnerLimit = limit
                });
            }

            var subtotal = adjustedItems.Sum(i => i.AdjustedAmount);
            var afterExcess = Math.Max(0, subtotal - request.Excess);
            var coPay = afterExcess * request.CoPayRate;
            var final = Math.Min(request.PolicyLimit, afterExcess - coPay);

            return (adjustedItems, new ClaimBreakdown
            {
                Subtotal = subtotal,
                ExcessDeduction = request.Excess,
                AmountAfterExcess = afterExcess,
                CoPayDeduction = coPay,
                FinalPayout = final
            });
        }
    }
}