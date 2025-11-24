export interface LineItem {
    item: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface QuoteResult {
    lineItems: LineItem[];
    totalPrice: number;
}

export interface MaterialItem {
  quantity: number;
  description: string;
}

export interface Materials {
  file?: string;
  items?: MaterialItem[];
}