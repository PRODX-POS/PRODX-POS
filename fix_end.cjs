const fs = require('fs');

let c = fs.readFileSync('src/modules/audit/AuditScreen.tsx', 'utf8');
c = c.replace(
  '    </div>\n  );\n};',
  '      </div>\n    </div>\n  );\n};'
);
fs.writeFileSync('src/modules/audit/AuditScreen.tsx', c);

let sh = fs.readFileSync('src/modules/shift/ShiftScreen.tsx', 'utf8');
sh = sh.replace(
  '      </div>\n      </div>\n      ) : (\n        <div className="w-full h-[50vh] flex items-center justify-center text-text/50 border-2 border-dashed border-border rounded-lg">\n          {t.shift.noShiftActive}\n        </div>\n      )}',
  '        </div>\n      </div>\n      ) : (\n        <div className="w-full h-[50vh] flex items-center justify-center text-text/50 border-2 border-dashed border-border rounded-lg">\n          {t.shift.noShiftActive}\n        </div>\n      )}'
);

fs.writeFileSync('src/modules/shift/ShiftScreen.tsx', sh);

