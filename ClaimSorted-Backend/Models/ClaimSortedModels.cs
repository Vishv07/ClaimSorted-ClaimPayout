using System;
using System.Collections.Generic;

namespace ClaimSorted.Models
{
    public class ClaimBreakdown
    {
        public decimal Subtotal { get; set; }
        public decimal ExcessDeduction { get; set; }
        public decimal AmountAfterExcess { get; set; }
        public decimal CoPayDeduction { get; set; }
        public decimal FinalPayout { get; set; }
    }

    public class ClaimRequest
    {
        public List<ClaimItem> ClaimItems { get; set; } = new List<ClaimItem>();
        public decimal PolicyLimit { get; set; }
        public decimal Excess { get; set; }
        public decimal CoPayRate { get; set; }
    }


    public class ClaimItem
    {
        public string Category { get; set; } = string.Empty;
        public decimal ClaimedAmount { get; set; }
        public decimal AdjustedAmount { get; set; }
        public decimal InnerLimit { get; set; }
    }

    public class ClaimCalculation
    {
        public int Id { get; set; }
        public decimal PolicyLimit { get; set; }
        public decimal Excess { get; set; }
        public decimal CoPayRate { get; set; }
        public decimal Subtotal { get; set; }
        public decimal ExcessDeduction { get; set; }
        public decimal AmountAfterExcess { get; set; }
        public decimal CoPayDeduction { get; set; }
        public decimal FinalPayout { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<ClaimItem> ClaimItems { get; set; }
    }

}