import { Money } from '../../domain/money';
import { Order } from '../../domain/order';
import { Product } from '../../domain/catalog';

export interface DashboardMetrics {
  readonly netSales: Money;
  readonly grossSales: Money;
  readonly ordersCount: number;
  readonly avgOrderValue: Money;
  readonly totalItemsSold: number;
  readonly avgItemsPerOrder: string;
  readonly cashSales: Money;
  readonly digitalSales: Money;
  readonly cashOrdersCount: number;
  readonly digitalOrdersCount: number;
  readonly lowStockCount: number;
  readonly outOfStockCount: number;
  readonly totalInventoryCount: number;
}

export interface HourlyDataPoint {
  readonly hour: string;
  readonly amount: number;
  readonly orders: number;
  readonly units: number;
  readonly fullHour?: string;
  readonly isCurrentHour?: boolean;
  readonly hour24?: number;
}
