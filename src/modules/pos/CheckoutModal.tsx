import React from 'react';
import {
  PaymentConfirmationModal,
  PaymentConfirmationModalProps,
} from './PaymentConfirmationModal';
import { Order } from '../../domain/order';

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = (props) => {
  return <PaymentConfirmationModal {...props} />;
};

export { PaymentConfirmationModal };
