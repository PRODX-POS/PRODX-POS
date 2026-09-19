import type { Express, Request, Response } from 'express';
import { requirePermission } from './createApp';
import { createPaymentLifecycleService, PaymentLifecycleError, type PaymentLifecycleStatus } from '../transactions/payment-lifecycle';
import type { TransactionalSqlExecutor } from '../db/transaction';

type PaymentBody = {
  orderId: string; paymentId: string; idempotencyKey: string; to: PaymentLifecycleStatus;
  provider: string; providerReference?: string; failureCode?: string; failureReason?: string;
};
const statuses = new Set<PaymentLifecycleStatus>(['authorized','captured','failed','cancelled','unknown']);
const isBody = (v: unknown): v is PaymentBody => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const b=v as Record<string,unknown>;
  return typeof b.orderId==='string' && b.orderId.trim().length>0 &&
    typeof b.paymentId==='string' && b.paymentId.trim().length>0 &&
    typeof b.idempotencyKey==='string' && b.idempotencyKey.trim().length>0 &&
    typeof b.provider==='string' && b.provider.trim().length>0 &&
    typeof b.to==='string' && statuses.has(b.to as PaymentLifecycleStatus) &&
    (b.providerReference===undefined || typeof b.providerReference==='string') &&
    (b.failureCode===undefined || typeof b.failureCode==='string') &&
    (b.failureReason===undefined || typeof b.failureReason==='string');
};

export const registerPaymentLifecycleRoute=(app: Express, db: TransactionalSqlExecutor, permission='payment.capture'): void=>{
  const service=createPaymentLifecycleService(db);
  app.post('/api/v1/payments/lifecycle', requirePermission(permission), async (request: Request,response: Response)=>{
    try {
      const context=request.prodxContext;
      if(!context){ response.status(500).json({error:{code:'REQUEST_CONTEXT_MISSING',message:'Request context is required.',requestId:request.id}}); return; }
      if(!isBody(request.body)){ response.status(400).json({error:{code:'PAYMENT_VALIDATION_FAILED',message:'The payment lifecycle request body is malformed.',requestId:request.id}}); return; }
      const b=request.body;
      const result=await service.transition({...b,storeId:context.principal.storeId});
      response.status(result.idempotency_key===b.idempotencyKey?200:201).json(result);
    } catch(error) {
      if(error instanceof PaymentLifecycleError){ response.status(409).json({error:{code:error.code,message:error.message,requestId:request.id}}); return; }
      throw error;
    }
  });
};
