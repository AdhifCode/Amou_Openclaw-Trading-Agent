## 📊 FRONTEND IMPLEMENTATION - REACT/NEXT.JS DASHBOARD

### Project Structure

```
dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── portfolio/
│   │   ├── trades/
│   │   ├── agents/
│   │   └── settings/
│   └── api/
│       └── [...proxy]/route.ts
├── components/
│   ├── Dashboard/
│   │   ├── Overview.tsx
│   │   ├── PortfolioCard.tsx
│   │   ├── AgentStatus.tsx
│   │   ├── TradeHistory.tsx
│   │   └── RiskMetrics.tsx
│   ├── Charts/
│   │   ├── PnLChart.tsx
│   │   └── OrderBookChart.tsx
│   └── ui/
│       └── ... (shadcn/ui components)
├── hooks/
│   ├── useWebSocket.ts
│   ├── usePortfolio.ts
│   └── useAgents.ts
├── lib/
│   ├── api.ts
│   └── websocket.ts
└── types/
    └── index.ts
```

### WebSocket Hook

**File: `dashboard/hooks/useWebSocket.ts`**

```typescript
import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  url: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
}

interface WebSocketState {
  connected: boolean;
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    error: null,
  });

  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Function>>(new Map());

  useEffect(() => {
    const socket = io(options.url, {
      autoConnect: options.autoConnect ?? true,
      reconnection: options.reconnection ?? true,
      reconnectionDelay: options.reconnectionDelay ?? 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setState({ connected: true, error: null });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setState({ connected: false, error: null });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setState({ connected: false, error });
    });

    return () => {
      socket.disconnect();
    };
  }, [options.url, options.autoConnect, options.reconnection, options.reconnectionDelay]);

  const subscribe = useCallback((channel: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe', [channel]);
    }
  }, []);

  const on = useCallback((event: string, callback: Function) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as any);
      listenersRef.current.set(event, callback);
    }
  }, []);

  const off = useCallback((event: string) => {
    if (socketRef.current && listenersRef.current.has(event)) {
      socketRef.current.off(event);
      listenersRef.current.delete(event);
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return {
    ...state,
    subscribe,
    on,
    off,
    emit,
  };
}
```

### Portfolio Hook

**File: `dashboard/hooks/usePortfolio.ts`**

```typescript
import { useState, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';

interface Portfolio {
  balance: Record<string, number>;
  free: Record<string, number>;
  used: Record<string, number>;
  totalValueUSDT: number;
  timestamp: string;
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const ws = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000',
  });

  useEffect(() => {
    if (ws.connected) {
      // Subscribe to portfolio updates
      ws.subscribe('portfolio');

      // Listen for initial data
      ws.on('initial-data', (data: any) => {
        setPortfolio(data.portfolio);
        setLoading(false);
      });

      // Listen for portfolio updates
      ws.on('portfolio-update', (data: Portfolio) => {
        setPortfolio(data);
      });
    }

    return () => {
      ws.off('initial-data');
      ws.off('portfolio-update');
    };
  }, [ws.connected]);

  return { portfolio, loading, error };
}
```

### Dashboard Overview Component

**File: `dashboard/components/Dashboard/Overview.tsx`**

```typescript
'use client';

import { usePortfolio } from '@/hooks/usePortfolio';
import { useAgents } from '@/hooks/useAgents';
import { usePositions } from '@/hooks/usePositions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardOverview() {
  const { portfolio, loading: portfolioLoading } = usePortfolio();
  const { agents, loading: agentsLoading } = useAgents();
  const { positions, loading: positionsLoading } = usePositions();

  if (portfolioLoading || agentsLoading || positionsLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${portfolio?.totalValueUSDT.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">USDT equivalent</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Active trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agents?.filter((a) => a.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {agents?.length || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant="default" className="bg-green-500">
                Operational
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">All systems normal</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents?.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      agent.status === 'active'
                        ? 'bg-green-500'
                        : agent.status === 'idle'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {agent.currentTask || 'Idle'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      agent.status === 'active'
                        ? 'default'
                        : agent.status === 'idle'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {agent.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(agent.lastActivity).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Open Positions */}
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions?.positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open positions</p>
          ) : (
            <div className="space-y-4">
              {positions?.positions.map((position) => (
                <div
                  key={position.orderId}
                  className="flex items-center justify-between border-b pb-4 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{position.symbol}</p>
                    <p className="text-xs text-muted-foreground">
                      {position.side} • {position.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {position.amount} @ ${position.price}
                    </p>
                    <Badge variant="outline">{position.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[100px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px]" />
              <Skeleton className="h-3 w-[80px] mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔄 INTEGRATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface                            │
│  • Web Dashboard (React/Next.js)                            │
│  • Discord Commands                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                           │
│  • REST API (Express)                                        │
│  • WebSocket Server (Socket.io)                             │
│  • Authentication & Rate Limiting                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Orchestrator Layer                          │
│  • Manages watchlist                                         │
│  • Coordinates agent workflow                                │
│  • Prevents infinite loops                                   │
│  • Circuit breaker pattern                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Agent Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Analyst    │  │  Strategist  │  │   Executor   │     │
│  │ (Haiku 4.6)  │  │ (Sonnet 4.6) │  │  (Opus 4.8)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Monitor    │  │  Developer   │                        │
│  │ (Haiku 4.6)  │  │ (Sonnet 4.6) │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  • Strategy Manager (per-coin strategies)                   │
│  • Model Manager (per-agent models)                         │
│  • Risk Manager (position & loss limits)                    │
│  • Binance Service (market data & execution)                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  • Binance API (CCXT)                                       │
│  • Claude API (Anthropic)                                   │
│  • Redis (Event Bus & Cache)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Feature 1: Dynamic Analyst Agent
- [ ] Create `config/strategies.json`
- [ ] Implement `shared/strategy-manager.js`
- [ ] Implement `agents/analyst/dynamic-analyzer.js`
- [ ] Update Analyst agent to use dynamic strategies
- [ ] Create API endpoints for strategy management
- [ ] Test with multiple coins and strategies

### Feature 2: Real-time Web Dashboard
- [ ] Set up Next.js project
- [ ] Implement `api/dashboard-server.js`
- [ ] Create WebSocket hooks
- [ ] Build dashboard components
- [ ] Implement real-time updates
- [ ] Add charts and visualizations
- [ ] Test WebSocket connections

### Feature 3: Autonomous Communication
- [ ] Implement `shared/orchestrator.js`
- [ ] Create orchestrator API routes
- [ ] Implement circuit breaker pattern
- [ ] Add event emitters for agent communication
- [ ] Test autonomous workflow
- [ ] Implement watchlist management

### Feature 4: Per-Agent Model Selection
- [ ] Create `config/agent-models.json`
- [ ] Implement `shared/model-manager.js`
- [ ] Update OpenClaw agent to use model manager
- [ ] Add model selection API
- [ ] Implement cost tracking
- [ ] Test with different models

---

## 🚀 DEPLOYMENT STEPS

### 1. Backend Setup

```bash
# Install new dependencies
npm install socket.io express cors

# Create new directories
mkdir -p api config/strategies

# Copy implementation files
# (strategy-manager.js, orchestrator.js, model-manager.js, etc.)

# Update .env
echo "DASHBOARD_URL=http://localhost:3000" >> .env
echo "API_PORT=4000" >> .env
```

### 2. Frontend Setup

```bash
# Create Next.js project
cd ..
npx create-next-app@latest dashboard --typescript --tailwind --app

cd dashboard

# Install dependencies
npm install socket.io-client recharts @tanstack/react-query
npm install -D @types/node

# Copy dashboard components
# (hooks, components, lib, etc.)
```

### 3. Start Services

```bash
# Terminal 1: Backend API
cd trading-multi-agent
node api/dashboard-server.js

# Terminal 2: Main system
npm run dev

# Terminal 3: Dashboard
cd dashboard
npm run dev
```

---

## 📊 API ENDPOINTS SUMMARY

### REST API

```
GET  /api/health              - Health check
GET  /api/status              - System status
GET  /api/portfolio           - Portfolio data
GET  /api/trades              - Trade history
GET  /api/positions           - Open positions
GET  /api/agents              - Agent status
GET  /api/risk                - Risk metrics

POST /api/orchestrator/start  - Start autonomous mode
POST /api/orchestrator/stop   - Stop autonomous mode
GET  /api/orchestrator/status - Orchestrator status
PUT  /api/orchestrator/watchlist - Update watchlist

GET  /api/strategies          - Get all strategies
PUT  /api/strategies/:pair    - Update strategy
GET  /api/models              - Get model catalog
PUT  /api/models/:agent       - Update agent model
```

### WebSocket Events

```
Client → Server:
  - subscribe: [channels]

Server → Client:
  - initial-data: { status, portfolio, positions, agents }
  - portfolio-update: Portfolio
  - positions-update: Positions
  - agents-update: Agents
  - trade-event: TradeEvent
  - workflow-completed: WorkflowResult
```

---

*End of Enhancement Design Document*
