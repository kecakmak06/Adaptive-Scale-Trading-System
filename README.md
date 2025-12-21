<<<<<<< HEAD
# Adaptive-Scalar-Trading-System
Real-time paper trading platform with adaptive scalar algorithms
=======
# SCALPX - Stock Scalp Trading App

A professional scalp trading interface built with Next.js and integrated with Interactive Brokers (IBKR) API.

## Features

- Real-time market data streaming
- Quick order entry (Market & Limit orders)
- Position monitoring with P&L tracking
- Order book visualization
- Account balance and performance tracking
- Dark theme optimized for trading

## Setup

### Prerequisites

1. **Interactive Brokers Account** - You need an IBKR account (paper trading or live)
2. **TWS or IB Gateway** - Download and install either:
   - [Trader Workstation (TWS)](https://www.interactivebrokers.com/en/trading/tws.php)
   - [IB Gateway](https://www.interactivebrokers.com/en/trading/ibgateway-stable.php)

### Installation

1. Install dependencies:
```bash
npm install
# or
pnpm install
```

2. Install IBKR API package:
```bash
npm install @stoqey/ib
```

3. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:
- `IBKR_HOST`: Usually `127.0.0.1` (localhost)
- `IBKR_PORT`: 
  - `4002` for IB Gateway Paper Trading (default)
  - `4001` for IB Gateway Live Trading
  - `7497` for TWS Paper Trading
  - `7496` for TWS Live Trading
- `IBKR_CLIENT_ID`: Unique client ID (default: `1`)

### TWS/IB Gateway Configuration

1. Open TWS or IB Gateway
2. Go to **Edit > Global Configuration > API > Settings**
3. Enable the following:
   - **Enable ActiveX and Socket Clients**
   - **Allow connections from localhost only** (for security)
   - **Read-Only API** (uncheck for trading)
4. Set the **Socket port** to match your `IBKR_PORT` setting
5. Add `127.0.0.1` to **Trusted IP Addresses**
6. Click **OK** and restart TWS/IB Gateway

### Running the App

1. Start TWS or IB Gateway and log in

2. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000)

4. The app will automatically attempt to connect to IBKR on load

## API Endpoints

- `POST /api/ibkr/connect` - Connect to IBKR
- `POST /api/ibkr/order` - Place order
- `GET /api/ibkr/account` - Get account summary
- `GET /api/ibkr/positions` - Get current positions
- `GET /api/ibkr/market-data?symbol=AAPL` - Get market data for symbol

## Usage

1. **Watchlist** - Click symbols in the left sidebar to switch charts
2. **Quick Trade** - Use the right panel to place market or limit orders
3. **Positions** - Monitor open positions in the bottom panel
4. **Market Data** - View real-time prices and order book depth

## Important Notes

- **Paper Trading First**: Always test with paper trading before using live trading
- **API Permissions**: Ensure API trading is enabled in your IBKR account settings
- **Market Data**: You need active market data subscriptions for real-time data
- **Security**: Never expose your IBKR credentials or run this on a public server without proper security measures

## Troubleshooting

### Connection Issues

- Verify TWS/IB Gateway is running and logged in
- Check that the port in `.env.local` matches TWS/IB Gateway settings
- Ensure firewall isn't blocking local connections
- Verify "Enable ActiveX and Socket Clients" is enabled in TWS settings

### Order Placement Issues

- Confirm "Read-Only API" is disabled in TWS settings
- Check that you have sufficient buying power
- Verify the symbol is valid and market is open

### Market Data Issues

- Ensure you have active market data subscriptions
- Check that market is open for the symbol you're requesting
- Real-time data requires proper data subscriptions

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- @stoqey/ib (IBKR API)

## License

MIT
>>>>>>> fcb916a (Initial commit)
