using Azure.Core;
using Azure.Identity;
using ClaimSorted.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
//using System.Data.SqlClient;
using System.Threading.Tasks;

namespace ClaimSorted.Respository
{
    public interface IClaimRepository
    {
        Task<int> InsertCalculationAsync(ClaimRequest request, List<ClaimItem> items, ClaimBreakdown breakdown);
        Task<List<ClaimCalculation>> GetRecentClaimsAsync();
    }

    public class ClaimRepository : IClaimRepository
    {
        private readonly string _connectionString;

        public ClaimRepository(IConfiguration configuration)
        {
            _connectionString = configuration["SqlConnection"];

            if (string.IsNullOrWhiteSpace(_connectionString))
                throw new Exception("SqlConnection config is missing or null.");
        }

        private SqlConnection GetConnection()
        {
            var conn = new SqlConnection(_connectionString);

            try
            {
                var token = new DefaultAzureCredential()
                  .GetToken(new TokenRequestContext(new[] { "https://database.windows.net/.default" }))
                  .Token;

                conn.AccessToken = token;

            }
            catch (Exception ex)
            {
                throw new Exception("Failed to set access token for SQL connection.", ex);
            }

            return conn;
        }

        public async Task<int> InsertCalculationAsync(ClaimRequest request, List<ClaimItem> items, ClaimBreakdown breakdown)
        {
            SqlConnection conn = null;
            SqlTransaction tx = null;

            try
            {
                conn = GetConnection();
                await conn.OpenAsync();
                tx = conn.BeginTransaction();

                var insertCalcCmd = new SqlCommand(@"
                    INSERT INTO ClaimCalculations 
                    (PolicyLimit, Excess, CoPayRate, Subtotal, ExcessDeduction, AmountAfterExcess, CoPayDeduction, FinalPayout)
                    OUTPUT INSERTED.Id
                    VALUES (@PolicyLimit, @Excess, @CoPayRate, @Subtotal, @ExcessDeduction, @AmountAfterExcess, @CoPayDeduction, @FinalPayout)
                ", conn, tx);

                insertCalcCmd.Parameters.AddWithValue("@PolicyLimit", request.PolicyLimit);
                insertCalcCmd.Parameters.AddWithValue("@Excess", request.Excess);
                insertCalcCmd.Parameters.AddWithValue("@CoPayRate", request.CoPayRate);
                insertCalcCmd.Parameters.AddWithValue("@Subtotal", breakdown.Subtotal);
                insertCalcCmd.Parameters.AddWithValue("@ExcessDeduction", breakdown.ExcessDeduction);
                insertCalcCmd.Parameters.AddWithValue("@AmountAfterExcess", breakdown.AmountAfterExcess);
                insertCalcCmd.Parameters.AddWithValue("@CoPayDeduction", breakdown.CoPayDeduction);
                insertCalcCmd.Parameters.AddWithValue("@FinalPayout", breakdown.FinalPayout);

                var calcId = (int)await insertCalcCmd.ExecuteScalarAsync();

                foreach (var item in items)
                {
                    var itemCmd = new SqlCommand(@"
                        INSERT INTO ClaimCalculationItems
                        (ClaimCalculationId, Category, ClaimedAmount, AdjustedAmount, InnerLimit)
                        VALUES (@ClaimCalculationId, @Category, @ClaimedAmount, @AdjustedAmount, @InnerLimit)
                    ", conn, tx);

                    itemCmd.Parameters.AddWithValue("@ClaimCalculationId", calcId);
                    itemCmd.Parameters.AddWithValue("@Category", item.Category);
                    itemCmd.Parameters.AddWithValue("@ClaimedAmount", item.ClaimedAmount);
                    itemCmd.Parameters.AddWithValue("@AdjustedAmount", item.AdjustedAmount);
                    itemCmd.Parameters.AddWithValue("@InnerLimit", item.InnerLimit);

                    await itemCmd.ExecuteNonQueryAsync();
                }

                tx.Commit();
                return calcId;
            }
            catch (Exception ex)
            {
                tx?.Rollback();
                throw ex;
            }
            finally
            {
                tx?.Dispose();
                conn?.Dispose();
            }
        }

        public async Task<List<ClaimCalculation>> GetRecentClaimsAsync()
        {
            var claims = new List<ClaimCalculation>();
            try
            {

                var conn = GetConnection();
                await conn.OpenAsync();

                var cmd = new SqlCommand(@"
                SELECT TOP 100 * FROM ClaimCalculations ORDER BY CreatedAt DESC;
                SELECT * FROM ClaimCalculationItems WHERE ClaimCalculationId IN (
                    SELECT TOP 100 Id FROM ClaimCalculations ORDER BY CreatedAt DESC
                );", conn);

                var reader = await cmd.ExecuteReaderAsync();

                var calculations = new Dictionary<int, ClaimCalculation>();

                while (await reader.ReadAsync())
                {
                    var calc = new ClaimCalculation
                    {
                        Id = reader.GetInt32(0),
                        PolicyLimit = reader.GetDecimal(1),
                        Excess = reader.GetDecimal(2),
                        CoPayRate = reader.GetDecimal(3),
                        Subtotal = reader.GetDecimal(4),
                        ExcessDeduction = reader.GetDecimal(5),
                        AmountAfterExcess = reader.GetDecimal(6),
                        CoPayDeduction = reader.GetDecimal(7),
                        FinalPayout = reader.GetDecimal(8),
                        CreatedAt = reader.GetDateTime(9),
                        ClaimItems = new List<ClaimItem>()
                    };
                    calculations[calc.Id] = calc;
                }

                await reader.NextResultAsync();

                while (await reader.ReadAsync())
                {
                    var item = new ClaimItem
                    {
                        Category = reader.GetString(2),
                        ClaimedAmount = reader.GetDecimal(3),
                        AdjustedAmount = reader.GetDecimal(4),
                        InnerLimit = reader.GetDecimal(5)
                    };

                    int claimId = reader.GetInt32(1);
                    if (calculations.ContainsKey(claimId))
                    {
                        calculations[claimId].ClaimItems.Add(item);
                    }
                }

                claims.AddRange(calculations.Values);
            }
            catch (Exception ex)
            {
                throw ex;
            }
            return claims;
        }
    }
}