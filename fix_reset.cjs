const fs = require('fs');
let s = fs.readFileSync('src/modules/settings/components/AppearanceSettingsTab.tsx', 'utf8');

s = s.replace(
  "{language === 'th' ? 'คืนค่าเริ่มต้น' : 'Reset Defaults'}",
  "{language === 'th' ? 'คืนค่าเริ่มต้นเป็นค่าโรงงาน' : 'Reset to Factory Defaults'}"
);

fs.writeFileSync('src/modules/settings/components/AppearanceSettingsTab.tsx', s);
