const fs = require('fs');
let s = fs.readFileSync('src/modules/settings/SettingsScreen.tsx', 'utf8');

// Optimize main grid spacing on mobile
s = s.replace(
  '<div className="grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] gap-6 items-start">',
  '<div className="grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr] gap-4 sm:gap-6 items-start">'
);

// Optimize category tabs for mobile scrolling (adding snap points and better gap)
s = s.replace(
  'className="bg-card/70 border border-border/80 rounded-lg p-1.5 shadow-xs flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar"',
  'className="bg-card/70 border border-border/80 rounded-lg p-1.5 shadow-xs flex flex-row md:flex-col gap-2 md:gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar snap-x snap-mandatory"'
);

// Optimize Tab button on mobile (ensure it doesn't get squashed)
s = s.replace(
  'className={`w-full text-left p-2.5 sm:p-3 rounded-md transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer shrink-0 md:shrink select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${',
  'className={`min-w-[140px] md:min-w-0 w-full text-left p-2.5 sm:p-3 rounded-md transition-all duration-150 flex items-center justify-between gap-2 sm:gap-3 cursor-pointer shrink-0 select-none snap-start focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${'
);

fs.writeFileSync('src/modules/settings/SettingsScreen.tsx', s);
console.log("SettingsScreen patched");
