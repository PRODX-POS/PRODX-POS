import assert from 'node:assert/strict';
import test from 'node:test';
import { createPaymentLifecycleService, PaymentLifecycleError } from './payment-lifecycle';

const executor=(payment: Record<string,unknown>, attempts: Record<string,unknown>[]=[]): any => {
  const tx={query:async(sql:string)=>{
    if(sql.includes('FROM prodx_payment_attempts')) return {rows:attempts};
    if(sql.includes('UPDATE prodx_payments')) { payment.status='captured'; return {rows:[payment]}; }
    if(sql.includes('INSERT INTO prodx_payment_attempts')) return {rows:[{id:'attempt-1',idempotency_key:'idem-1'}]};
    if(sql.includes('FROM prodx_payments')) return {rows:[payment]};
    return {rows:[]};
  }};
  return {transaction:async(fn:any)=>fn(tx)};
};
test('payment lifecycle replays an existing idempotency attempt',async()=>{
  const existing={id:'attempt-1',status:'captured'};
  const result=await createPaymentLifecycleService(executor({id:'pay-1',order_id:'ord-1',status:'authorized'},[existing])).transition({storeId:'store-1',orderId:'ord-1',paymentId:'pay-1',idempotencyKey:'idem-1',to:'captured',provider:'terminal'});
  assert.deepEqual(result,existing);
});
test('payment lifecycle rejects cross-order transitions',async()=>{
  await assert.rejects(createPaymentLifecycleService(executor({id:'pay-1',order_id:'other-order',status:'authorized'})).transition({storeId:'store-1',orderId:'ord-1',paymentId:'pay-1',idempotencyKey:'idem-2',to:'captured',provider:'terminal'}),PaymentLifecycleError);
});
test('payment lifecycle rejects invalid transitions',async()=>{
  await assert.rejects(createPaymentLifecycleService(executor({id:'pay-1',order_id:'ord-1',status:'failed'})).transition({storeId:'store-1',orderId:'ord-1',paymentId:'pay-1',idempotencyKey:'idem-3',to:'captured',provider:'terminal'}),/Invalid payment transition failed -> captured/);
});
