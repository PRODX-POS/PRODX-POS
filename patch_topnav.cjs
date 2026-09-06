const fs = require('fs');
let s = fs.readFileSync('src/components/layout/TopNav.tsx', 'utf8');

// 1. Adjust TopNav Header padding
s = s.replace(
  '<header className="h-16 min-h-[56px] sm:min-h-[64px] w-full max-w-full border-b border-border border-crisp bg-card text-text px-2.5 sm:px-4 flex items-center justify-between z-30 shrink-0 select-none overflow-x-hidden">',
  '<header className="h-14 sm:h-16 lg:h-16 w-full max-w-full border-b border-border border-crisp bg-card text-text px-2 sm:px-4 lg:px-6 flex items-center justify-between z-30 shrink-0 select-none overflow-x-hidden">'
);

// 2. Adjust Held Orders / Badges gap for better breathing room
s = s.replace(
  '<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">',
  '<div className="flex items-center gap-1 sm:gap-2 lg:gap-3 shrink-0">'
);

// 3. Adjust Profile Avatar Button size for better scale
s = s.replace(
  '<button\n              type="button"\n              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}\n              className="ml-1 sm:ml-2 flex items-center gap-2 p-1 pl-1 pr-3 sm:pr-3 sm:pl-1.5 min-h-[44px] rounded-full border border-border border-crisp hover:bg-background/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95"',
  '<button\n              type="button"\n              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}\n              className="ml-1 sm:ml-2 lg:ml-4 flex items-center gap-2 p-1 pl-1 pr-2 sm:pr-3 sm:pl-1.5 min-h-[40px] sm:min-h-[44px] rounded-full border border-border border-crisp hover:bg-background/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-95"'
);

// 4. Shrink avatar image on very small screens
s = s.replace(
  '<img\n                  src={session.currentUser.avatarUrl}\n                  alt={session.currentUser.name}\n                  className="w-9 h-9 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 bg-background"',
  '<img\n                  src={session.currentUser.avatarUrl}\n                  alt={session.currentUser.name}\n                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shrink-0 bg-background"'
);

fs.writeFileSync('src/components/layout/TopNav.tsx', s);
console.log("TopNav patched");
