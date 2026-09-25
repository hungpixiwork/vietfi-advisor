# Portfolio Backtest and Projection

## Goal
Implement a portfolio backtesting feature starting from 2021 and a 10-year future projection with 3 scenarios, using real market data.

## Tasks
- [ ] Task 1: Research and identify real market data sources (API or DB) for historical prices since 2021 → Verify: Document data source and sample response.
- [ ] Task 2: Create backend API endpoint `/api/portfolio/backtest` to calculate historical performance → Verify: `curl localhost:3000/api/portfolio/backtest` returns calculated metrics since 2021.
- [ ] Task 3: Create backend API endpoint `/api/portfolio/projection` to calculate 10-year projection (bull, base, bear scenarios) → Verify: `curl localhost:3000/api/portfolio/projection` returns 3 scenario data points.
- [ ] Task 4: Design and implement Backtest UI widget/chart in `src/app/dashboard/portfolio/page.tsx` → Verify: UI renders historical performance chart correctly.
- [ ] Task 5: Design and implement Projection UI widget/chart in `src/app/dashboard/portfolio/page.tsx` → Verify: UI renders future scenarios chart with interactive toggles.
- [ ] Task 6: Integrate UI with backend endpoints to ensure data is real → Verify: Charts populate with actual fetched market data instead of predefined placeholders.

## Done When
- [ ] The dashboard displays a backtest chart from 2021 using real historical data.
- [ ] The dashboard displays a 10-year projection chart highlighting 3 distinct scenarios.
