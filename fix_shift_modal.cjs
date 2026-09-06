const fs = require('fs');
let s = fs.readFileSync('src/modules/shift/ShiftScreen.tsx', 'utf8');

s = s.replace(
  '        </div>\n      </Card>\n        </div>\n      </div>\n      ) : (\n        <div className="w-full h-[50vh] flex items-center justify-center text-text/50 border-2 border-dashed border-border rounded-lg">\n          {t.shift.noShiftActive}\n        </div>\n      )}',
  '        </div>\n      </Card>'
);

fs.writeFileSync('src/modules/shift/ShiftScreen.tsx', s);
