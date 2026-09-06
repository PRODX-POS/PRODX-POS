/**
 * PRODX POS Domain - Shifts & Cash Drawer Management
 */

import { Money, createMoney, addMoney, subtractMoney } from './money';

export type ShiftStatus = 'open' | 'closed';

export type CashMovementType =
  | 'opening_float'
  | 'cash_sale'
  | 'cash_refund'
  | 'paid_in'
  | 'paid_out'
  | 'drawer_drop';

export interface CashMovement {
  readonly id: string;
  readonly shiftId: string;
  readonly type: CashMovementType;
  readonly amount: Money;
  readonly reason: string;
  readonly performedByUserId: string;
  readonly timestamp: string; // ISO 8601 UTC
}

export type TimeclockStatus = 'clocked_in' | 'clocked_out';

export interface TimeclockRecord {
  readonly id: string;
  readonly userId: string;
  readonly userName: string;
  readonly employeeCode: string;
  readonly shiftId?: string; // Optional context linking to POS drawer shift
  readonly status: TimeclockStatus;
  readonly clockedInAt: string; // ISO 8601 UTC
  readonly clockedOutAt?: string; // ISO 8601 UTC
}

export interface Shift {
  readonly id: string;
  readonly storeId: string;
  readonly registerId: string;
  readonly cashierId: string;
  readonly cashierName: string;
  readonly openedAt: string; // ISO 8601 UTC
  readonly closedAt?: string;
  readonly status: ShiftStatus;
  readonly openingFloat: Money;
  readonly movements: readonly CashMovement[];
  readonly totalCashSales: Money;
  readonly totalCashRefunds: Money;
  readonly totalPaidIn: Money;
  readonly totalPaidOut: Money;
  readonly expectedCashInDrawer: Money;
  readonly actualCountedCash?: Money;
  readonly variance?: Money; // actual - expected
  readonly closingNotes?: string;
}

export function computeExpectedDrawerCash(
  openingFloat: Money,
  movements: readonly CashMovement[]
): Money {
  let total = openingFloat;
  for (const m of movements) {
    if (m.type === 'opening_float' || m.type === 'cash_sale' || m.type === 'paid_in') {
      total = addMoney(total, m.amount);
    } else if (m.type === 'cash_refund' || m.type === 'paid_out' || m.type === 'drawer_drop') {
      total = subtractMoney(total, m.amount);
    }
  }
  return total;
}
