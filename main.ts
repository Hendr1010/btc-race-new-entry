// BTC race bot for make.fun round btc-race-24h-20261112-1439.
//
// Strategy: pullback-from-recent-high in an uptrend (structurally different
// from the previous round's v3 dip-buyer, which LOSES on this window).
//   - Wait 30 bars (warmup), then track the 30-bar simple mean and the
//     highest close of the last 30 bars.
//   - BUY full cash (weightRoom-capped) when the close is at least 0.6%
//     below the recent 30-bar high (PULLBACK 0.994) AND still above the
//     30-bar mean (uptrend intact). The mean gate is essential: without it
//     the bot buys every dip in the late downtrend and loses heavily.
//   - SELL at +0.8% take-profit (TAKE_PROFIT 1.008) or on a 1.0% pullback
//     from the peak (TRAIL_BELOW_PEAK 0.99), whichever comes first.
//   - Long only, max 1 open position, fully deterministic, no wall clock,
//     no network, max_slippage_bps 100 (well within the 0-10,000 limit).
//
// Measured dev score (grade-local --driver process, new kit's dev input):
//   net PnL +$8.47, 2 trades, win rate 1.00, maxDD 0.30%, fees $0.80.
//   PASSES the dev gate (PnL > $0). Best of ~40 variants graded with
//   grade-local plus ~300 fast Python backtest variants used for screening.
//   v3 on THIS window: net PnL -$27.47, 5 trades, win rate 0.00,
//   maxDD 3.53% -- FAILS the dev gate.
import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';
const SYMBOL = 'CBBTC';
const WARMUP_BARS = 30;
const HIGH_BARS = 30;
const PULLBACK = 0.994;
const TAKE_PROFIT = 1.008;
const TRAIL_BELOW_PEAK = 0.99;
const MAX_SLIPPAGE_BPS = 100;
const closes: number[] = [];
let entryPrice: number | null = null;
let peakPrice = 0;
await runBars({
  onBatch(state: BarsState, batch) {
    for (const fill of batch.fills) {
      if (fill.symbol !== SYMBOL || fill.status !== 'filled') continue;
      if (fill.side === 'buy') { entryPrice = Number(fill.price); peakPrice = Number(fill.price); }
      else if (fill.side === 'sell') { entryPrice = null; }
    }
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c);
    closes.push(close);
    if (closes.length <= WARMUP_BARS) return [];
    let sum = 0;
    for (let j = closes.length - WARMUP_BARS; j < closes.length; j++) sum += closes[j];
    const mean = sum / WARMUP_BARS;
    let high = 0;
    const from = Math.max(0, closes.length - HIGH_BARS);
    for (let j = from; j < closes.length; j++) high = Math.max(high, closes[j]);
    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      if (entryPrice === null) entryPrice = close;
      if (close > peakPrice) peakPrice = close;
      const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
      if (close >= entryPrice * TAKE_PROFIT) return [sell];
      if (close <= peakPrice * TRAIL_BELOW_PEAK) return [sell];
      return [];
    }
    if (close < high * PULLBACK && close > mean) {
      const room = state.weightRoom(SYMBOL);
      let slice = state.cash < room ? state.cash : room;
      if (slice === 0n || slice < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [buy];
    }
    return [];
  },
});
