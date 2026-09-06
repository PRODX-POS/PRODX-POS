const fs = require('fs');
let s = fs.readFileSync('src/modules/pos/PosScreen.tsx', 'utf8');

s = s.replace(
  '        {/* Product Catalog Grid Scroll Area */}\n        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 no-scrollbar">',
  '        {/* Product Catalog Grid Scroll Area */}\n        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 pb-24 lg:pb-5 no-scrollbar">'
);

fs.writeFileSync('src/modules/pos/PosScreen.tsx', s);
