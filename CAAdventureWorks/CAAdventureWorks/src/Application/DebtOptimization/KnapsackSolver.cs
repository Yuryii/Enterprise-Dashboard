namespace CAAdventureWorks.Application.DebtOptimization;

public sealed record DebtItem(
    int Id,
    decimal Amount,
    int ImportanceScore,
    string VendorName,
    string VendorEmail,
    string InvoiceNumber,
    string Category,
    DateTime DueDate
);

public sealed record KnapsackResult(
    List<DebtItem> SelectedItems,
    List<DebtItem> DeferredItems,
    decimal TotalPaidAmount,
    int TotalImportanceScore,
    decimal RemainingBudget
);

public sealed class KnapsackSolver
{
    public KnapsackResult Solve(List<DebtItem> items, decimal budget)
    {
        if (items.Count == 0 || budget <= 0)
        {
            return new KnapsackResult([], [], 0, 0, budget);
        }

        // Scale down: divide by 1_000_000 to avoid large DP table
        const decimal scale = 1_000_000m;
        int scaledBudget = (int)Math.Floor(budget / scale);

        // Filter out items larger than budget
        var feasible = items
            .Select(item => new { item, scaledCost = (int)Math.Floor(item.Amount / scale) })
            .Where(x => x.scaledCost > 0)
            .ToList();

        if (feasible.Count == 0)
        {
            return new KnapsackResult([], items, 0, 0, budget);
        }

        int n = feasible.Count;

        // DP: dp[i][w] = max value using first i items with capacity w
        // Use 1D rolling array for memory efficiency
        var dp = new decimal[scaledBudget + 1];
        var chosen = new bool[n, scaledBudget + 1];

        for (int i = 0; i < n; i++)
        {
            int cost = feasible[i].scaledCost;
            int value = feasible[i].item.ImportanceScore;

            for (int w = scaledBudget; w >= cost; w--)
            {
                decimal newValue = dp[w - cost] + value;
                if (newValue > dp[w])
                {
                    dp[w] = newValue;
                    chosen[i, w] = true;
                }
            }
        }

        // Find max value achieved
        decimal maxValue = dp[scaledBudget];
        int bestW = scaledBudget;
        for (int w = scaledBudget - 1; w >= 0; w--)
        {
            if (dp[w] >= maxValue && dp[w] <= maxValue)
            {
                if (dp[w] == maxValue)
                {
                    bestW = w;
                    break;
                }
            }
        }
        bestW = Array.IndexOf(dp, dp.Max());

        // Reconstruct selected items by backtracking
        var selected = new List<DebtItem>();
        var deferredSet = new HashSet<int>();

        for (int i = n - 1; i >= 0; i--)
        {
            if (bestW >= 0 && chosen[i, bestW])
            {
                selected.Add(feasible[i].item);
                bestW -= feasible[i].scaledCost;
            }
            else
            {
                deferredSet.Add(i);
            }
        }

        // Items not in feasible list are automatically deferred
        var allDeferred = feasible
            .Where((_, idx) => deferredSet.Contains(idx))
            .Select(x => x.item)
            .ToList();

        // Also add items that were filtered out (too expensive for budget)
        var tooExpensive = items
            .Where(item => (int)Math.Floor(item.Amount / scale) == 0 && item.Amount > 0)
            .ToList();
        allDeferred.AddRange(tooExpensive);

        decimal totalPaid = selected.Sum(x => x.Amount);
        int totalImportance = selected.Sum(x => x.ImportanceScore);
        decimal remaining = budget - totalPaid;

        return new KnapsackResult(selected, allDeferred, totalPaid, totalImportance, remaining);
    }
}
