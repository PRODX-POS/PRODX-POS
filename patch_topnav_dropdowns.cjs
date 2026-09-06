const fs = require('fs');
let s = fs.readFileSync('src/components/layout/TopNav.tsx', 'utf8');

// 1. Add backdrop right before <header>
const headerTarget = '<header className="h-14 sm:h-16 lg:h-16';
const backdropReplacement = `      {(isStoreMenuOpen || isUserMenuOpen || isLangMenuOpen || isCurrencyMenuOpen) && (
        <div 
          className="fixed inset-0 z-[45] bg-transparent" 
          onClick={() => {
            setIsStoreMenuOpen(false);
            setIsUserMenuOpen(false);
            setIsLangMenuOpen(false);
            setIsCurrencyMenuOpen(false);
          }} 
        />
      )}
      <header className="h-14 sm:h-16 lg:h-16`;

s = s.replace(headerTarget, backdropReplacement);

// 2. Update store menu toggle
s = s.replace(
  'onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}',
  'onClick={() => { setIsStoreMenuOpen(!isStoreMenuOpen); setIsCurrencyMenuOpen(false); setIsLangMenuOpen(false); setIsUserMenuOpen(false); }}'
);

// 3. Update currency menu toggle
s = s.replace(
  'onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}',
  'onClick={() => { setIsCurrencyMenuOpen(!isCurrencyMenuOpen); setIsStoreMenuOpen(false); setIsLangMenuOpen(false); setIsUserMenuOpen(false); }}'
);

// 4. Update language menu toggle
s = s.replace(
  'onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}',
  'onClick={() => { setIsLangMenuOpen(!isLangMenuOpen); setIsStoreMenuOpen(false); setIsCurrencyMenuOpen(false); setIsUserMenuOpen(false); }}'
);

// 5. Update user menu toggle
s = s.replace(
  'onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}',
  'onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsStoreMenuOpen(false); setIsCurrencyMenuOpen(false); setIsLangMenuOpen(false); }}'
);

fs.writeFileSync('src/components/layout/TopNav.tsx', s);
console.log("TopNav dropdowns patched successfully");
