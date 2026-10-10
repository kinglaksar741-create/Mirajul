export type InstagramServiceType = 'Instagram Views' | 'Instagram Likes';

export interface InstagramPackageTier {
  id: string;
  service: InstagramServiceType;
  shortLabel: string;
  label: string;
  quantity: number;
  priceInr: number;
}

/**
 * ============================================================================
 * MIRAJ SMM STORE — PUBLIC INSTAGRAM VIEWS & LIKES CONFIGURATION
 * ============================================================================
 * WhatsApp Number: 6002191384 (India country code +91 -> 916002191384)
 */
export const WHATSAPP_NUMBER = '916002191384';

/**
 * Service Rates per 1,000 units:
 * - Instagram Views: ₹1 per 1,000 views (5K = ₹5, 10K = ₹10, 20K = ₹20 ... 100K = ₹100)
 * - Instagram Likes: ₹25 per 1,000 likes (1K = ₹25, 2K = ₹50, 3K = ₹75 ... 10K = ₹250)
 */
export const PRICE_PER_1000_VIEWS = 1;
export const PRICE_PER_1000_LIKES = 25;

const VIEWS_TIERS = [
  { shortLabel: '5K', quantity: 5000, priceInr: 5 },
  { shortLabel: '10K', quantity: 10000, priceInr: 10 },
  { shortLabel: '20K', quantity: 20000, priceInr: 20 },
  { shortLabel: '30K', quantity: 30000, priceInr: 30 },
  { shortLabel: '40K', quantity: 40000, priceInr: 40 },
  { shortLabel: '50K', quantity: 50000, priceInr: 50 },
  { shortLabel: '60K', quantity: 60000, priceInr: 60 },
  { shortLabel: '70K', quantity: 70000, priceInr: 70 },
  { shortLabel: '80K', quantity: 80000, priceInr: 80 },
  { shortLabel: '90K', quantity: 90000, priceInr: 90 },
  { shortLabel: '100K', quantity: 100000, priceInr: 100 },
];

const LIKES_TIERS = [
  { shortLabel: '1K', quantity: 1000, priceInr: 25 },
  { shortLabel: '2K', quantity: 2000, priceInr: 50 },
  { shortLabel: '3K', quantity: 3000, priceInr: 75 },
  { shortLabel: '4K', quantity: 4000, priceInr: 100 },
  { shortLabel: '5K', quantity: 5000, priceInr: 125 },
  { shortLabel: '6K', quantity: 6000, priceInr: 150 },
  { shortLabel: '7K', quantity: 7000, priceInr: 175 },
  { shortLabel: '8K', quantity: 8000, priceInr: 200 },
  { shortLabel: '9K', quantity: 9000, priceInr: 225 },
  { shortLabel: '10K', quantity: 10000, priceInr: 250 },
];

export const INSTAGRAM_VIEW_PACKAGES: InstagramPackageTier[] = VIEWS_TIERS.map((tier) => ({
  id: `views-${tier.shortLabel.toLowerCase()}`,
  service: 'Instagram Views',
  shortLabel: tier.shortLabel,
  label: `${tier.shortLabel} Views`,
  quantity: tier.quantity,
  priceInr: tier.priceInr,
}));

export const INSTAGRAM_LIKE_PACKAGES: InstagramPackageTier[] = LIKES_TIERS.map((tier) => ({
  id: `likes-${tier.shortLabel.toLowerCase()}`,
  service: 'Instagram Likes',
  shortLabel: tier.shortLabel,
  label: `${tier.shortLabel} Likes`,
  quantity: tier.quantity,
  priceInr: tier.priceInr,
}));
