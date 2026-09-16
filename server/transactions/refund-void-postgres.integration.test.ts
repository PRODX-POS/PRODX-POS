import assert from 'node:assert/strict';
import test from 'node:test';
import { createPostgresPool } from '../db/postgres';
import { createTransactionalPostgresExecutor } from '../db/transaction';
import { createCheckoutService } from './checkout-service';
import { createRefundVoidService } from './refund-void-service';
import type { CheckoutRequest } from '../../src/adapters/types';

const url = process.env.DATABASE_URL;
const pool = url ? createPostgresPool({ connectionString: url, max: 8 }) : null;
const db = pool ? createTransactionalPostgresExecutor(pool) : null;
const id = { org:'00000000-0000-4000-8000-000000001101', store:'00000000-0000-4000-8000-000000001102', user:'00000000-0000-4000-8000-000000001104', reg:'00000000-0000-4000-8000-000000001105', shift:'00000000-0000-4000-8000-000000001106', cat:'00000000-0000-4000-8000-000000001107', product:'00000000-0000-4000-8000-000000001108' };

const paymentIdByRequestKey: Record<string, string> = {
  'rv-sale': '00000000-0000-4000-8000-000000001109',
  'rv-void': '00000000-0000-4000-8000-000000001110',
};

const request = (key:string): CheckoutRequest => ({
  idempotencyKey:key, storeId:id.store, registerId:id.reg, cashierId:id.user,
  items:[{lineId:'line',product:{id:id.product,storeId:id.store,sku:'RV-1',barcode:'RV-1',name:'Refund Product',categoryId:id.cat,price:{amountInCents:1000,currency:'THB'},costPrice:{amountInCents:500,currency:'THB'},taxRateBps:0,currentStock:10,reorderPoint:1,unitOfMeasure:'each'},quantity:2,unitPrice:{amountInCents:1000,currency:'THB'},discountBps:0,lineSubtotal:{amountInCents:2000,currency:'THB'},lineTax:{amountInCents:0,currency:'THB'},lineTotal:{amountInCents:2000,currency:'THB'}}],
  totals:{grossSubtotal:{amountInCents:2000,currency:'THB'},itemDiscounts:{amountInCents:0,currency:'THB'},orderDiscount:{amountInCents:0,currency:'THB'},netSubtotal:{amountInCents:2000,currency:'THB'},totalTax:{amountInCents:0,currency:'THB'},grandTotal:{amountInCents:2000,currency:'THB'},totalItemsCount:2},
  payments:[{id:paymentIdByRequestKey[key] ?? `00000000-0000-4000-8000-${key.slice(-12).padStart(12,'0')}`,method:'cash',amount:{amountInCents:2000,currency:'THB'},tenderedCash:{amountInCents:2000,currency:'THB'},changeGiven:{amountInCents:0,currency:'THB'},timestamp:'2026-09-17T00:00:00.000Z'}]
});

async function clean(){
  if(!pool)return;
  for(const q of [
    ['DELETE FROM prodx_cash_movements WHERE shift_id=$1',[id.shift]],['DELETE FROM prodx_audit_log WHERE store_id=$1',[id.store]],['DELETE FROM prodx_refund_items WHERE store_id=$1',[id.store]],['DELETE FROM prodx_order_adjustments WHERE store_id=$1',[id.store]],['DELETE FROM prodx_payments WHERE store_id=$1',[id.store]],['DELETE FROM prodx_order_items WHERE store_id=$1',[id.store]],['DELETE FROM prodx_inventory_ledger WHERE store_id=$1',[id.store]],['DELETE FROM prodx_orders WHERE store_id=$1',[id.store]],['DELETE FROM prodx_shifts WHERE id=$1',[id.shift]],['DELETE FROM prodx_products WHERE id=$1',[id.product]],['DELETE FROM prodx_categories WHERE id=$1',[id.cat]],['DELETE FROM prodx_registers WHERE id=$1',[id.reg]],['DELETE FROM prodx_store_memberships WHERE store_id=$1',[id.store]],['DELETE FROM prodx_users WHERE id=$1',[id.user]],['DELETE FROM prodx_stores WHERE id=$1',[id.store]],['DELETE FROM prodx_organizations WHERE id=$1',[id.org]]]) await pool.query(q[0] as string,q[1] as string[]);
}
async function seed(){
  if(!pool)throw new Error('DATABASE_URL required'); await clean();
  await pool.query('INSERT INTO prodx_organizations(id,code,name) VALUES($1,$2,$3)',[id.org,'rv-core','Refund Void Org']);
  await pool.query("INSERT INTO prodx_stores(id,organization_id,code,name,business_timezone) VALUES($1,$2,'rv-1','RV Store','Asia/Bangkok')",[id.store,id.org]);
  await pool.query('INSERT INTO prodx_users(id,organization_id,username,display_name) VALUES($1,$2,$3,$4)',[id.user,id.org,'rv-user','RV User']);
  await pool.query('INSERT INTO prodx_store_memberships(organization_id,store_id,user_id) VALUES($1,$2,$3)',[id.org,id.store,id.user]);
  await pool.query('INSERT INTO prodx_registers(id,organization_id,store_id,code,name) VALUES($1,$2,$3,\'R1\',\'Register\')',[id.reg,id.org,id.store]);
  await pool.query("INSERT INTO prodx_shifts(id,organization_id,store_id,register_id,cashier_id,opening_float_amount,currency) VALUES($1,$2,$3,$4,$5,0,'THB')",[id.shift,id.org,id.store,id.reg,id.user]);
  await pool.query('INSERT INTO prodx_categories(id,organization_id,store_id,name,slug) VALUES($1,$2,$3,\'Category\',\'category\')',[id.cat,id.org,id.store]);
  await pool.query("INSERT INTO prodx_products(id,organization_id,store_id,category_id,sku,barcode,name,price_amount,cost_price_amount,currency,tax_rate_bps,current_stock,reorder_point,unit_of_measure) VALUES($1,$2,$3,$4,'RV-1','RV-1','Refund Product',10,5,'THB',0,10,1,'each')",[id.product,id.org,id.store,id.cat]);
}

test('PostgreSQL refund/void are authoritative, idempotent, atomic and bounded',async t=>{
  if(!pool||!db){t.skip('DATABASE_URL not configured');return;}
  await seed(); t.after(async()=>{await clean();await pool.end();});
  const checkout=createCheckoutService(db); const adjustments=createRefundVoidService(db);
  const sale=await checkout.checkout(request('rv-sale')); assert.equal(sale.order.totals.grandTotal.amountInCents,2000);
  const refunded=await adjustments.refund({storeId:id.store,orderId:sale.order.id,amountInCents:1000,currency:'THB',reason:'Customer returned one unit',refundMethod:'cash',authorizedByUserId:id.user,idempotencyKey:'refund-1',itemsToRestock:[{productId:id.product,quantity:1}]});
  assert.equal(refunded.idempotencyCached,false);
  assert.equal((await pool.query('SELECT current_stock FROM prodx_products WHERE id=$1',[id.product])).rows[0].current_stock,9);
  assert.equal((await pool.query("SELECT count(*)::int n FROM prodx_cash_movements WHERE shift_id=$1 AND type='cash_refund'",[id.shift])).rows[0].n,1);
  const cached=await adjustments.refund({storeId:id.store,orderId:sale.order.id,amountInCents:1000,currency:'THB',reason:'Customer returned one unit',refundMethod:'cash',authorizedByUserId:id.user,idempotencyKey:'refund-1',itemsToRestock:[{productId:id.product,quantity:1}]}); assert.equal(cached.idempotencyCached,true);
  await assert.rejects(adjustments.refund({storeId:id.store,orderId:sale.order.id,amountInCents:900,currency:'THB',reason:'Different request',refundMethod:'cash',authorizedByUserId:id.user,idempotencyKey:'refund-1',itemsToRestock:[]}));
  await assert.rejects(adjustments.refund({storeId:id.store,orderId:sale.order.id,amountInCents:1100,currency:'THB',reason:'Too much',refundMethod:'cash',authorizedByUserId:id.user,idempotencyKey:'refund-over',itemsToRestock:[]}));
  const before=Number((await pool.query('SELECT current_stock FROM prodx_products WHERE id=$1',[id.product])).rows[0].current_stock);
  await assert.rejects(adjustments.refund({storeId:id.store,orderId:sale.order.id,amountInCents:500,currency:'THB',reason:'Bad restock',refundMethod:'cash',authorizedByUserId:id.user,idempotencyKey:'refund-bad',itemsToRestock:[{productId:id.product,quantity:99}]}));
  assert.equal(Number((await pool.query('SELECT current_stock FROM prodx_products WHERE id=$1',[id.product])).rows[0].current_stock),before);

  const sale2=await checkout.checkout(request('rv-void')); const voided=await adjustments.void({storeId:id.store,orderId:sale2.order.id,reason:'Duplicate sale',authorizedByUserId:id.user,idempotencyKey:'void-1'}); assert.equal(voided.idempotencyCached,false);
  assert.equal((await pool.query("SELECT status FROM prodx_orders WHERE id=$1",[sale2.order.id])).rows[0].status,'voided');
  assert.equal((await pool.query("SELECT count(*)::int n FROM prodx_cash_movements WHERE shift_id=$1 AND type='cash_refund'",[id.shift])).rows[0].n,2);
  const voidCached=await adjustments.void({storeId:id.store,orderId:sale2.order.id,reason:'Duplicate sale',authorizedByUserId:id.user,idempotencyKey:'void-1'}); assert.equal(voidCached.idempotencyCached,true);
  await assert.rejects(adjustments.void({storeId:id.store,orderId:sale2.order.id,reason:'Different request',authorizedByUserId:id.user,idempotencyKey:'void-1'}));
  assert.equal((await pool.query("SELECT count(*)::int n FROM prodx_order_adjustments WHERE order_id=$1",[sale2.order.id])).rows[0].n,1);
});
