# BTC Race Bot — pullback-from-recent-high uptrend bot

Entry for make.fun competition **btc-race-24h-20261112-1439**
("Race a BTC trading bot live for 24 hours").

## Strategy

A pullback-from-recent-high uptrend bot on 1-minute cbBTC bars (Orca
Whirlpool, Solana). It anchors on the recent 30-bar high, buys a 0.6%
pullback from that high while price stays above the 30-bar mean, and sells
at a +0.8% take-profit or on a 1.0% pullback from the peak. Long only,
at most one open position, fully deterministic (seeded, no network, no
wall clock).

## Measured dev score

**+$8.47 net PnL** on the competition dev window (2 trades, win rate
1.00, max drawdown 0.30%) — passes the dev gate (net PnL > $0).

## Entrypoint

main.ts (Node 22, standard library plus the vendored SDK in
vendor/makefun-bars.ts) is the bot entrypoint: it reads one JSON bar
per minute and answers with buy/sell orders.
