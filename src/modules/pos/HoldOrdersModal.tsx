import React from 'react';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Clock, Trash2, ArrowRight } from 'lucide-react';
import { formatMoney, createMoney } from '../../domain/money';

export interface HoldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HoldOrdersModal: React.FC<HoldOrdersModalProps> = ({ isOpen, onClose }) => {
  const { heldCarts, recallHeldCart, deleteHeldCart } = useCart();
  const { t, language } = useLanguage();

  const handleRecall = (id: string) => {
    recallHeldCart(id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.pos.holdModalTitle}
      description={t.pos.holdModalSub}
      maxWidth="md"
    >
      {heldCarts.length === 0 ? (
        <div className="py-8 text-center text-text/50 text-xs">
          {t.pos.noHeldCarts}
        </div>
      ) : (
        <div className="space-y-2.5">
          {heldCarts.map((h) => {
            const itemCount = h.items.reduce((acc, i) => acc + i.quantity, 0);
            const rawSubtotal = h.items.reduce(
              (acc, i) => acc + i.unitPrice.amountInCents * i.quantity,
              0
            );

            return (
              <div
                key={h.id}
                className="p-3.5 rounded-lg border-crisp border border-border bg-card flex items-center justify-between gap-4 shadow-2xs"
              >
                <div>
                  <div className="text-xs font-semibold text-text flex items-center gap-2">
                    <span>{h.label}</span>
                    <span className="text-[10px] text-text/50 font-normal">
                      {new Date(h.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-text/70 mt-0.5">
                    <span className="font-mono font-medium">{itemCount}</span> {t.pos.itemCount} ·{' '}
                    {language === 'th' ? 'ประมาณ' : 'Est.'}{' '}
                    <span className="font-mono font-medium">{formatMoney(createMoney(rawSubtotal))}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteHeldCart(h.id)}
                    className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 shadow-2xs"
                    title={t.pos.deleteHeldCart}
                    aria-label={t.pos.deleteHeldCart}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleRecall(h.id)}
                    className="min-h-[44px] px-3.5 rounded-lg font-semibold text-xs shadow-2xs"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t.pos.restoreCart}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
