import { Injectable } from '@nestjs/common';
import { CreateKitchenQuoteDto } from './dto/create-quote.dto';
import { KITCHEN_QUOTE_CONFIG } from './config/quote.config';
import { LineItem, QuoteResult } from './types/quote.types';

@Injectable()
export class QuoteService {
  calculateKitchenQuote(dto: CreateKitchenQuoteDto): QuoteResult {
    const lineItems: LineItem[] = [];
    let totalPrice = 0;

    // Iterate over every possible key from our price configuration
    for (const key in KITCHEN_QUOTE_CONFIG) {
      if (Object.prototype.hasOwnProperty.call(dto, key)) {
        const value = dto[key];
        const config = KITCHEN_QUOTE_CONFIG[key];

        // Skip if the value is null, false, 0, or an empty string
        if (!value) {
          continue;
        }

        let itemPrice = 0;
        let quantity = 1;

        switch (config.type) {
          case 'FIXED':
            // For boolean fields that are true
            if (value === true) {
              itemPrice = config.price;
            }
            break;

          case 'PER_UNIT':
            let numericValue: number;

            // If quantity is specified in another field, use that field's value
            if (config.quantityField && dto[config.quantityField]) {
              const quantityValue = dto[config.quantityField];
              numericValue = typeof quantityValue === 'string'
                ? parseFloat(quantityValue)
                : quantityValue as number;
            } else {
              // Otherwise, use the field's own value
              numericValue = typeof value === 'string'
                ? parseFloat(value)
                : value as number;
            }

            if (!isNaN(numericValue) && numericValue > 0) {
              quantity = numericValue;
              itemPrice = quantity * config.price;
            }
            break;
        }

        if (itemPrice > 0) {
          totalPrice += itemPrice;
          lineItems.push({
            item: key,
            description: config.description,
            quantity: quantity,
            unitPrice: config.price,
            total: parseFloat(itemPrice.toFixed(2)),
          });
        }
      }
    }

    return {
      lineItems,
      totalPrice: parseFloat(totalPrice.toFixed(2)), // Round final price to 2 decimal places
    };
  }
}