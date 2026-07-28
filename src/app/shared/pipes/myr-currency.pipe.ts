import { Pipe, PipeTransform } from '@angular/core';

import { formatMyrCurrency } from '../utils/currency.util';

@Pipe({
  name: 'myrCurrency',
  standalone: true,
})
export class MyrCurrencyPipe implements PipeTransform {
  transform(value: unknown, fallback = '-'): string {
    return formatMyrCurrency(value, fallback);
  }
}
