const fs = require('fs');
let s = fs.readFileSync('src/modules/dashboard/DashboardScreen.tsx', 'utf8');

// 1. Add isFinancialAuthorized
s = s.replace(
  '  const { t, language } = useLanguage();',
  '  const { t, language } = useLanguage();\n\n  const isFinancialAuthorized = session?.currentUser?.role === \'admin\' || session?.currentUser?.role === \'manager\';'
);

// 2. Update Primary KPI grid
s = s.replace(
  '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">',
  '<div className={`grid grid-cols-1 sm:grid-cols-2 ${isFinancialAuthorized ? \'lg:grid-cols-4\' : \'lg:grid-cols-2\'} gap-3 sm:gap-4 lg:gap-5`}>'
);

// 3. Wrap Card 1
s = s.replace(
  '        {/* Card 1: Selected Period Net Revenue */}\n        <Card className="hover:border-primary/40 transition-all shadow-2xs">',
  '        {/* Card 1: Selected Period Net Revenue */}\n        {isFinancialAuthorized && (\n        <Card className="hover:border-primary/40 transition-all shadow-2xs">'
);

// Close Card 1
s = s.replace(
  '            </div>\n          </CardBody>\n        </Card>\n\n        {/* Card 2: Completed Transactions & AOV */}',
  '            </div>\n          </CardBody>\n        </Card>\n        )}\n\n        {/* Card 2: Completed Transactions & AOV */}'
);

// 4. Wrap Card 2
s = s.replace(
  '        {/* Card 2: Completed Transactions & AOV */}\n        <Card className="hover:border-border transition-all shadow-2xs">',
  '        {/* Card 2: Completed Transactions & AOV */}\n        {isFinancialAuthorized && (\n        <Card className="hover:border-border transition-all shadow-2xs">'
);

// Close Card 2
s = s.replace(
  '            </div>\n          </CardBody>\n        </Card>\n\n        {/* Card 3: Shift Drawer Cash & Register */}',
  '            </div>\n          </CardBody>\n        </Card>\n        )}\n\n        {/* Card 3: Shift Drawer Cash & Register */}'
);

// 5. Update Secondary Performance Metric Strip grid
s = s.replace(
  '      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">',
  '      <div className={`grid grid-cols-2 ${isFinancialAuthorized ? \'md:grid-cols-4\' : \'\'} gap-2.5 sm:gap-3.5 lg:gap-4`}>'
);

// 6. Wrap Metric B
s = s.replace(
  '        {/* Metric B: Cash Payments */}\n        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">',
  '        {/* Metric B: Cash Payments */}\n        {isFinancialAuthorized && (\n        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">'
);

// Close Metric B
s = s.replace(
  '          </div>\n        </div>\n\n        {/* Metric C: Digital Payments (Card / QR) */}',
  '          </div>\n        </div>\n        )}\n\n        {/* Metric C: Digital Payments (Card / QR) */}'
);

// 7. Wrap Metric C
s = s.replace(
  '        {/* Metric C: Digital Payments (Card / QR) */}\n        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">',
  '        {/* Metric C: Digital Payments (Card / QR) */}\n        {isFinancialAuthorized && (\n        <div className="p-3.5 sm:p-4 rounded-lg border-border border-crisp bg-card shadow-2xs">'
);

// Close Metric C
s = s.replace(
  '          </div>\n        </div>\n\n        {/* Metric D: Active Catalog SKU Count */}',
  '          </div>\n        </div>\n        )}\n\n        {/* Metric D: Active Catalog SKU Count */}'
);

// 8. Wrap Hourly Sales Trend
s = s.replace(
  '      <div className="flex flex-col lg:flex-row gap-6 items-start">\n        {/* Hourly Sales Trend Visualizer (Spans 8 columns on large screens) */}\n        <Card className="w-full lg:w-[50%]">',
  '      <div className="flex flex-col lg:flex-row gap-6 items-start">\n        {/* Hourly Sales Trend Visualizer (Spans 8 columns on large screens) */}\n        {isFinancialAuthorized && (\n        <Card className="w-full lg:w-[50%]">'
);

// Close Hourly Sales Trend
s = s.replace(
  '            </div>\n          </CardBody>\n        </Card>\n\n        {/* Operational Quick Launchpad Hub (Spans 4 columns on large screens) */}',
  '            </div>\n          </CardBody>\n        </Card>\n        )}\n\n        {/* Operational Quick Launchpad Hub (Spans 4 columns on large screens) */}'
);

// 9. Update Quick Launchpad width
s = s.replace(
  '        {/* Operational Quick Launchpad Hub (Spans 4 columns on large screens) */}\n        <Card className="w-full lg:w-[50%] flex flex-col justify-between">',
  '        {/* Operational Quick Launchpad Hub (Spans 4 columns on large screens) */}\n        <Card className={`w-full ${isFinancialAuthorized ? \'lg:w-[50%]\' : \'\'} flex flex-col justify-between`}>'
);

fs.writeFileSync('src/modules/dashboard/DashboardScreen.tsx', s);
console.log("Done");
