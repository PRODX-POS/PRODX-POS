const fs = require('fs');
let s = fs.readFileSync('src/modules/pos/PosScreen.tsx', 'utf8');

const target = `        {/* Mobile Floating Cart Summary Bar */}
        <div className="md:hidden p-3 sm:p-4 border-t border-crisp border-border bg-card flex items-center justify-between shrink-0 shadow-lg">
          <div>
            <div className="text-[11px] text-text/70 font-semibold">
              {t.pos.cartTitle} (<span className="font-mono">{totals.totalItemsCount}</span> {t.pos.itemCount})
            </div>
            <div className="text-lg font-black font-mono text-primary">
              {formatMoney(totals.grandTotal)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="min-h-[48px] h-12 flex items-center gap-2.5 px-5 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-2xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95"
          >
            <ShoppingCart className="h-4.5 w-4.5" />
            <span>{t.pos.checkoutBtn}</span>
          </button>
        </div>
      </div>

      {/* Desktop/Tablet Right Side Cart Panel */}
      <div className="hidden md:block w-full md:w-[50%] lg:w-[45%] h-full shrink-0 border-l border-crisp border-border bg-card">`;

const replacement = `        {/* Mobile Floating Cart Summary Bar */}
        <AnimatePresence>
          {totals.totalItemsCount > 0 && (
            <motion.div
              initial={{ y: 150, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 150, opacity: 0 }}
              className="lg:hidden absolute bottom-4 left-4 right-4 p-4 border border-crisp border-primary/20 bg-card flex items-center justify-between shadow-2xl rounded-2xl z-40"
            >
              <div>
                <div className="text-[11px] text-text/70 font-semibold">
                  {t.pos.cartTitle} (<span className="font-mono">{totals.totalItemsCount}</span> {t.pos.itemCount})
                </div>
                <div className="text-lg font-black font-mono text-primary">
                  {formatMoney(totals.grandTotal)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileCartOpen(true)}
                className="min-h-[48px] h-12 flex items-center gap-2.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-2xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95"
              >
                <ShoppingCart className="h-4.5 w-4.5" />
                <span>{t.pos.checkoutBtn}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop/Tablet Right Side Cart Panel */}
      <div className="hidden lg:block w-full lg:w-[45%] xl:w-[40%] h-full shrink-0 border-l border-crisp border-border bg-card">`;

s = s.replace(target, replacement);
fs.writeFileSync('src/modules/pos/PosScreen.tsx', s);
