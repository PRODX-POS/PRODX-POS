const fs = require('fs');
let s = fs.readFileSync('src/components/layout/TopNav.tsx', 'utf8');

const target = `      {(isStoreMenuOpen || isUserMenuOpen || isLangMenuOpen || isCurrencyMenuOpen) && (
        <div 
          className="fixed inset-0 z-[45] bg-transparent" 
          onClick={() => {
            setIsStoreMenuOpen(false);
            setIsUserMenuOpen(false);
            setIsLangMenuOpen(false);
            setIsCurrencyMenuOpen(false);
          }} 
        />
      )}`;

s = s.replace(target, '');

fs.writeFileSync('src/components/layout/TopNav.tsx', s);
console.log("Backdrop removed from TopNav");
