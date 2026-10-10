import 'dotenv/config';
import express from 'express';
import path from 'path';

export interface SmmPackage {
  package: number;
  name: string;
  category: 'YouTube Views' | 'Instagram Views' | 'Facebook Views';
  rate: number; // Price in INR per 1,000 views
  min: number;
  max: number;
  type: string;
  deliveryWindow: string;
  retentionSpec: string;
  description: string;
}

export interface SmmOrderRecord {
  order: number;
  package: number;
  packageName: string;
  category: 'YouTube Views' | 'Instagram Views' | 'Facebook Views';
  customerName: string;
  link: string;
  quantity: number;
  charge: string;
  start_count: string;
  remains: string;
  status: 'Pending' | 'In progress' | 'Completed' | 'Partial' | 'Canceled';
  currency: string;
  createdAt: string;
  createdTimestamp: number;
  source: 'upstream_api' | 'store_engine';
}

const DEFAULT_PACKAGES: SmmPackage[] = [
  {
    package: 1,
    name: 'YouTube Views — Standard High-Retention Feed',
    category: 'YouTube Views',
    rate: 99,
    min: 500,
    max: 50000,
    type: 'Default',
    deliveryWindow: '2–6 hours',
    retentionSpec: 'High-retention feed discovery · Public Watch & Shorts URL',
    description: 'Steady watch-time delivery suitable for public YouTube videos and Shorts.',
  },
  {
    package: 2,
    name: 'YouTube Views — Suggested & Browse Velocity',
    category: 'YouTube Views',
    rate: 139,
    min: 1000,
    max: 100000,
    type: 'Default',
    deliveryWindow: '6–18 hours',
    retentionSpec: 'Sustained session pacing · Long-form & Music Premieres',
    description: 'Multi-wave distribution engineered for channel premieres and music releases.',
  },
  {
    package: 3,
    name: 'Instagram Views — Fast Reel Loop Momentum',
    category: 'Instagram Views',
    rate: 89,
    min: 500,
    max: 100000,
    type: 'Default',
    deliveryWindow: '15–60 mins',
    retentionSpec: 'Instant vertical feed velocity · Public Instagram Reels',
    description: 'Rapid initial Reel plays to accelerate early engagement on public Instagram profiles.',
  },
  {
    package: 4,
    name: 'Instagram Views — Explore Tab Creator Package',
    category: 'Instagram Views',
    rate: 119,
    min: 1000,
    max: 250000,
    type: 'Default',
    deliveryWindow: '1–4 hours',
    retentionSpec: 'Staggered high-completion delivery · Brand & Creator Reels',
    description: 'Balanced completion profile designed for commercial lookbooks and product drops.',
  },
  {
    package: 5,
    name: 'Facebook Views — Public Page Video & Reels',
    category: 'Facebook Views',
    rate: 95,
    min: 500,
    max: 50000,
    type: 'Default',
    deliveryWindow: '30–90 mins',
    retentionSpec: 'Autoplay feed distribution · Facebook Watch & Page Videos',
    description: 'Consistent reach across public Facebook Page videos and Facebook Reels.',
  },
  {
    package: 6,
    name: 'Facebook Views — Regional Broadcast Campaign',
    category: 'Facebook Views',
    rate: 125,
    min: 1000,
    max: 100000,
    type: 'Default',
    deliveryWindow: '4–12 hours',
    retentionSpec: 'Extended multi-hour rollout · Commercial Page Promos',
    description: 'High-volume campaign distribution for community broadcasts and event announcements.',
  },
];

// In-memory store state when external SMM_API_URL is not configured or unreachable
let currentBalanceInr = 12450.0;
let nextOrderId = 12348;

const nowMs = Date.now();
const ordersStore = new Map<number, SmmOrderRecord>([
  [
    12345,
    {
      order: 12345,
      package: 1,
      packageName: 'YouTube Views — Standard High-Retention Feed',
      category: 'YouTube Views',
      customerName: 'Arjun Deshmukh',
      link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      quantity: 5000,
      charge: '495.00',
      start_count: '1420',
      remains: '0',
      status: 'Completed',
      currency: 'INR',
      createdAt: '2 hours ago',
      createdTimestamp: nowMs - 7200 * 1000,
      source: 'store_engine',
    },
  ],
  [
    12346,
    {
      order: 12346,
      package: 3,
      packageName: 'Instagram Views — Fast Reel Loop Momentum',
      category: 'Instagram Views',
      customerName: 'Zoya Qureshi',
      link: 'https://www.instagram.com/reel/C8x9kLmN12/',
      quantity: 10000,
      charge: '890.00',
      start_count: '640',
      remains: '2150',
      status: 'In progress',
      currency: 'INR',
      createdAt: '28 mins ago',
      createdTimestamp: nowMs - 1680 * 1000,
      source: 'store_engine',
    },
  ],
  [
    12347,
    {
      order: 12347,
      package: 5,
      packageName: 'Facebook Views — Public Page Video & Reels',
      category: 'Facebook Views',
      customerName: 'Vikram Singhania',
      link: 'https://www.facebook.com/watch/?v=918273645',
      quantity: 2500,
      charge: '237.50',
      start_count: '310',
      remains: '840',
      status: 'In progress',
      currency: 'INR',
      createdAt: '14 mins ago',
      createdTimestamp: nowMs - 840 * 1000,
      source: 'store_engine',
    },
  ],
]);

/**
 * TypeScript equivalent of the PHP `class Api` for SMM Panel API v2 communication.
 * Uses HTTP POST with application/x-www-form-urlencoded payload.
 */
class SmmApiV2Client {
  private get apiUrl(): string {
    return process.env.SMM_API_URL || 'http://domain.com/api/v2/';
  }

  private get apiToken(): string {
    return process.env.SMM_API_TOKEN || 'YOUR_API_TOKEN';
  }

  public isLiveUpstreamConfigured(): boolean {
    const url = this.apiUrl.trim();
    const token = this.apiToken.trim();
    return (
      Boolean(url) &&
      url !== 'http://domain.com/api/v2/' &&
      Boolean(token) &&
      token !== 'YOUR_API_TOKEN'
    );
  }

  private async connect(postData: Record<string, string | number>): Promise<unknown | null> {
    if (!this.isLiveUpstreamConfigured()) {
      return null;
    }

    try {
      const formBody = new URLSearchParams();
      for (const [key, value] of Object.entries(postData)) {
        formBody.append(key, String(value));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  public async packages(): Promise<{ packages: SmmPackage[]; mode: 'upstream' | 'builtin' }> {
    const upstreamResult = await this.connect({
      api_token: this.apiToken,
      action: 'packages',
    });

    if (Array.isArray(upstreamResult) && upstreamResult.length > 0) {
      const normalized: SmmPackage[] = upstreamResult.map((item: Record<string, unknown>, idx) => {
        const rawCat = String(item.category || item.name || '');
        let category: 'YouTube Views' | 'Instagram Views' | 'Facebook Views' = 'YouTube Views';
        if (/instagram|reel/i.test(rawCat)) category = 'Instagram Views';
        else if (/facebook|fb/i.test(rawCat)) category = 'Facebook Views';

        return {
          package: Number(item.package || item.service || idx + 1),
          name: String(item.name || `Package #${idx + 1}`),
          category,
          rate: Number(item.rate || 99),
          min: Number(item.min || 100),
          max: Number(item.max || 50000),
          type: String(item.type || 'Default'),
          deliveryWindow: String(item.deliveryWindow || '1–6 hours'),
          retentionSpec: String(item.desc || item.description || 'Public URL delivery'),
          description: String(item.description || 'Automated SMM Panel API v2 package.'),
        };
      });
      return { packages: normalized, mode: 'upstream' };
    }

    return { packages: DEFAULT_PACKAGES, mode: 'builtin' };
  }

  public async balance(): Promise<{ balance: string; currency: string; mode: 'upstream' | 'builtin' }> {
    const upstreamResult = (await this.connect({
      api_token: this.apiToken,
      action: 'balance',
    })) as Record<string, unknown> | null;

    if (upstreamResult && typeof upstreamResult === 'object' && 'balance' in upstreamResult) {
      return {
        balance: String(upstreamResult.balance),
        currency: String(upstreamResult.currency || 'INR'),
        mode: 'upstream',
      };
    }

    return {
      balance: currentBalanceInr.toFixed(2),
      currency: 'INR',
      mode: 'builtin',
    };
  }

  public async order(data: {
    package: number;
    link: string;
    quantity: number;
    customerName?: string;
  }): Promise<{
    order: number;
    status: string;
    charge: string;
    remains: string;
    currency: string;
    record: SmmOrderRecord;
  }> {
    const pkgId = Number(data.package);
    const quantity = Number(data.quantity);
    const link = String(data.link || '').trim();
    const customerName = String(data.customerName || 'Store Customer').trim();

    const matchedPkg =
      DEFAULT_PACKAGES.find((p) => p.package === pkgId) || DEFAULT_PACKAGES[0];

    const calculatedCharge = Number(((matchedPkg.rate / 1000) * quantity).toFixed(2));

    const upstreamResult = (await this.connect({
      api_token: this.apiToken,
      action: 'add',
      package: pkgId,
      link,
      quantity,
    })) as Record<string, unknown> | null;

    let orderId = nextOrderId++;
    let source: 'upstream_api' | 'store_engine' = 'store_engine';

    if (upstreamResult && typeof upstreamResult === 'object' && 'order' in upstreamResult) {
      orderId = Number(upstreamResult.order) || orderId;
      source = 'upstream_api';
    } else {
      currentBalanceInr = Math.max(0, Number((currentBalanceInr - calculatedCharge).toFixed(2)));
    }

    const startCount = String(Math.floor(120 + Math.random() * 900));
    const record: SmmOrderRecord = {
      order: orderId,
      package: matchedPkg.package,
      packageName: matchedPkg.name,
      category: matchedPkg.category,
      customerName,
      link,
      quantity,
      charge: calculatedCharge.toFixed(2),
      start_count: startCount,
      remains: String(quantity),
      status: 'Pending',
      currency: 'INR',
      createdAt: 'Just now',
      createdTimestamp: Date.now(),
      source,
    };

    ordersStore.set(orderId, record);

    return {
      order: orderId,
      status: record.status,
      charge: record.charge,
      remains: record.remains,
      currency: record.currency,
      record,
    };
  }

  public async status(orderIdInput: number | string): Promise<SmmOrderRecord | { error: string }> {
    const orderId = Number(orderIdInput);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return { error: 'Invalid order ID' };
    }

    const upstreamResult = (await this.connect({
      api_token: this.apiToken,
      action: 'status',
      order: orderId,
    })) as Record<string, unknown> | null;

    const existing = ordersStore.get(orderId);

    if (upstreamResult && typeof upstreamResult === 'object' && 'status' in upstreamResult) {
      const updated: SmmOrderRecord = {
        order: orderId,
        package: existing?.package || 1,
        packageName: existing?.packageName || 'SMM API Package',
        category: existing?.category || 'YouTube Views',
        customerName: existing?.customerName || 'API Client',
        link: existing?.link || 'https://',
        quantity: existing?.quantity || Number(upstreamResult.remains || 1000),
        charge: String(upstreamResult.charge || existing?.charge || '99.00'),
        start_count: String(upstreamResult.start_count || existing?.start_count || '100'),
        remains: String(upstreamResult.remains ?? existing?.remains ?? '0'),
        status: (upstreamResult.status as SmmOrderRecord['status']) || 'In progress',
        currency: String(upstreamResult.currency || 'INR'),
        createdAt: existing?.createdAt || 'Synced via API v2',
        createdTimestamp: existing?.createdTimestamp || Date.now(),
        source: 'upstream_api',
      };
      ordersStore.set(orderId, updated);
      return updated;
    }

    if (!existing) {
      return { error: `Order #${orderId} was not found. Try #12345, #12346, or #12347.` };
    }

    // Progressively update dynamic delivery progress for realistic status checks
    const elapsedSeconds = Math.max(0, (Date.now() - existing.createdTimestamp) / 1000);
    if (existing.status !== 'Completed' && elapsedSeconds > 15) {
      const progressRatio = Math.min(1, elapsedSeconds / 180);
      const remainingViews = Math.max(0, Math.round(existing.quantity * (1 - progressRatio)));
      existing.remains = String(remainingViews);
      existing.status = remainingViews === 0 ? 'Completed' : 'In progress';
      const mins = Math.max(1, Math.floor(elapsedSeconds / 60));
      existing.createdAt = elapsedSeconds < 60 ? `${Math.floor(elapsedSeconds)}s ago` : `${mins} min ago`;
    }

    return existing;
  }

  public getAllOrders(): SmmOrderRecord[] {
    for (const [id] of ordersStore.entries()) {
      void this.status(id);
    }
    return Array.from(ordersStore.values()).sort((a, b) => b.order - a.order);
  }
}

const smmApi = new SmmApiV2Client();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 1. Unified SMM Panel API v2 POST endpoint (mirrors PHP `class Api` actions: packages, balance, add, status)
  app.post('/api/v2', async (req, res) => {
    const action = String(req.body.action || '').trim().toLowerCase();

    if (action === 'packages') {
      const data = await smmApi.packages();
      res.json(data.packages);
      return;
    }

    if (action === 'balance') {
      const data = await smmApi.balance();
      res.json({ balance: data.balance, currency: data.currency });
      return;
    }

    if (action === 'add') {
      const pkgId = Number(req.body.package);
      const quantity = Number(req.body.quantity);
      const link = String(req.body.link || '').trim();
      const customerName = String(req.body.customerName || 'Customer').trim();

      if (!pkgId || !link || !quantity || quantity <= 0) {
        res.status(400).json({ error: 'Missing or invalid package, link, or quantity parameter.' });
        return;
      }

      const result = await smmApi.order({
        package: pkgId,
        link,
        quantity,
        customerName,
      });
      res.json(result);
      return;
    }

    if (action === 'status') {
      const orderId = req.body.order;
      const result = await smmApi.status(orderId);
      if ('error' in result) {
        res.status(404).json(result);
        return;
      }
      res.json(result);
      return;
    }

    res.status(400).json({
      error: "Unsupported action. Allowed actions: 'packages', 'balance', 'add', 'status'.",
    });
  });

  // 2. RESTful helper routes for the React storefront
  app.get('/api/v2/overview', async (_req, res) => {
    const [pkgData, balData] = await Promise.all([smmApi.packages(), smmApi.balance()]);
    res.json({
      packages: pkgData.packages,
      balance: balData.balance,
      currency: balData.currency,
      mode: pkgData.mode,
      orders: smmApi.getAllOrders(),
    });
  });

  app.get('/api/v2/status/:orderId', async (req, res) => {
    const result = await smmApi.status(req.params.orderId);
    if ('error' in result) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  // Mount Vite dev server in development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(import.meta.dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Miraj Views Store & SMM API v2 Server running on http://localhost:${PORT}`);
  });
}

startServer();
