import assert from 'node:assert/strict';
import test from 'node:test';
import type { CheckoutRequest } from '../../src/adapters/types';
import { CheckoutConflictError, CheckoutValidationError, createCheckoutService } from './checkout-service';
import type { SqlQueryExecutor, TransactionalSqlExecutor } from '../db/transaction';

const request = (overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  idempotencyKey:'unit-1',storeId:'store-1',registerId:'register-1',cashierId:'user-1',
  items:[{lineId:'line-1',product:{id:'product-1',storeId:'store-1',sku:'SKU-1',barcode:'BAR-1',name:'Product',categoryId:'cat-1',price:{amountInCents:1000,currency:'THB'},costPrice:{amountInCents:500,currency:'THB'},taxRateBps:0,currentStock:10,reorderPoint:1,unitOfMeasure:'each',active:true},quantity:2,unitPrice:{amountInCents:1000,currency:'THB'},discountBps:0,lineSubtotal:{amountInCents:2000,currency:'THB'},lineTax:{amountInCents:0,currency:'THB'},lineTotal:{amountInCents:2000,currency:'THB'}}],
  totals:{grossSubtotal:{amountInCents:2000,currency:'THB'},itemDiscounts:{amountInCents:0,currency:'THB'},orderDiscount:{amountInCents:0,currency:'THB'},netSubtotal:{amountInCents:2000,currency:'THB'},totalTax:{amountInCents:0,currency:'THB'},grandTotal:{amountInCents:2000,currency:'THB'},totalItemsCount:2},
  payments:[{id:'payment-1',method:'cash',amount:{amountInCents:2000,currency:'THB'},tenderedCash:{amountInCents:2000,currency:'THB'},changeGiven:{amountInCents:0,currency:'THB'},timestamp:'2026-09-14T00:00:00.000Z'}],
  ...overrides,
});

const executor = (query:SqlQueryExecutor['query']):TransactionalSqlExecutor => ({query,transaction:<T>(work:(tx:SqlQueryExecutor)=>Promise<T>)=>work({query})});
const rows = <T extends Record<string,unknown>>(value:T[]):{rows:T[]}=>({rows:value});

const baseDb = (queries:string[] = []):TransactionalSqlExecutor => executor(async <T extends Record<string,unknown>>(sql:string)=>{
  queries.push(sql);
  if(sql.includes('FROM prodx_orders')) return rows<T>([]);
  if(sql.includes('FROM prodx_shifts')) return rows<T>([{id:'shift-1'} as T]);
  if(sql.includes('FROM prodx_products')) return rows<T>([{id:'product-1',store_id:'store-1',category_id:'cat-1',sku:'SKU-1',barcode:'BAR-1',name:'Product',description:null,price_amount:'10.00',cost_price_amount:'5.00',currency:'THB',tax_rate_bps:0,current_stock:10,reorder_point:1,unit_of_measure:'each',active:true} as T]);
  throw new Error(`unexpected query: ${sql}`);
});

test('rejects client grand-total tampering before financial writes', async()=>{
  const queries:string[]=[]; const db=baseDb(queries);
  await assert.rejects(createCheckoutService(db).checkout(request({totals:{...request().totals,grandTotal:{amountInCents:1,currency:'THB'}}})),(e:unknown)=>e instanceof CheckoutConflictError);
  assert.equal(queries.some(q=>/^INSERT|^UPDATE/.test(q.trimStart())),false);
});

test('rejects payment currency mismatch and malformed cash', async()=>{
  const db=baseDb();
  await assert.rejects(createCheckoutService(db).checkout(request({payments:[{...request().payments[0],amount:{amountInCents:2000,currency:'USD'}}]})),/payment/);
  await assert.rejects(createCheckoutService(db).checkout(request({payments:[{...request().payments[0],tenderedCash:{amountInCents:2100,currency:'THB'},changeGiven:{amountInCents:0,currency:'THB'}}]})),/Cash tender/);
});

test('requires idempotency key and positive items', async()=>{
  const db=baseDb();
  await assert.rejects(createCheckoutService(db).checkout(request({idempotencyKey:'   '})),(e:unknown)=>e instanceof CheckoutValidationError);
  await assert.rejects(createCheckoutService(db).checkout(request({items:[]})),(e:unknown)=>e instanceof CheckoutValidationError);
});

test('preserves transaction failures for rollback', async()=>{
  const db:TransactionalSqlExecutor={query:async()=>({rows:[]}),transaction:async()=>{throw new Error('db failure');}};
  await assert.rejects(createCheckoutService(db).checkout(request()),/db failure/);
});
