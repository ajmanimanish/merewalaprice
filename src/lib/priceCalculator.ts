export interface BankOffer {
  id: string;
  platform: string;
  bank: string;
  card_type: string;
  offer_type: string;
  discount_percent: number | null;
  max_discount: number | null;
  min_order: number;
  emi_months: number | null;
  offer_text: string;
}

export interface TruePrice {
  listed_price: number;
  best_discount: number;
  true_price: number;
  best_offer: BankOffer | null;
  installation_cost: number;
  total_cost: number;
}

export function calculateTruePrice(
  listedPrice: number,
  offers: BankOffer[],
  installationCost: number = 0
): TruePrice {
  let bestDiscount = 0;
  let bestOffer: BankOffer | null = null;

  for (const offer of offers) {
    if (offer.offer_type === 'emi') continue;
    if (listedPrice < offer.min_order) continue;
    if (!offer.discount_percent) continue;

    const rawDiscount = (listedPrice * offer.discount_percent) / 100;
    const actualDiscount = offer.max_discount
      ? Math.min(rawDiscount, offer.max_discount)
      : rawDiscount;

    if (actualDiscount > bestDiscount) {
      bestDiscount = actualDiscount;
      bestOffer = offer;
    }
  }

  return {
    listed_price: listedPrice,
    best_discount: Math.round(bestDiscount),
    true_price: Math.round(listedPrice - bestDiscount),
    best_offer: bestOffer,
    installation_cost: installationCost,
    total_cost: Math.round(listedPrice - bestDiscount + installationCost)
  };
}
