const fs = require('fs');
let s = fs.readFileSync('src/modules/audit/AuditScreen.tsx', 'utf8');

s = s.replace(
  '        </div>\n      </div>\n    </div>\n  );\n};',
  '        </div>\n      </div>\n    </div>\n    </div>\n  );\n};'
);

fs.writeFileSync('src/modules/audit/AuditScreen.tsx', s);

let sh = fs.readFileSync('src/modules/shift/ShiftScreen.tsx', 'utf8');
sh = sh.replace(
  '      </Card>\n      </div>\n      </div>\n      )}',
  '      </Card>\n      </div>\n      </div>\n      ) : (\n        <div className="w-full h-[50vh] flex items-center justify-center text-text/50 border-2 border-dashed border-border rounded-lg">\n          {t.shift.noShiftActive}\n        </div>\n      )}'
);

fs.writeFileSync('src/modules/shift/ShiftScreen.tsx', sh);

