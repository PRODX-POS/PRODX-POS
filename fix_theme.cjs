const fs = require('fs');
let s = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');

s = s.replace(
  '  // Clear legacy localStorage keys to ensure we use the unified ConfigPersistenceManager\n  useEffect(() => {\n    ConfigPersistenceManager.clearLegacyConfigs();\n  }, []);',
  ''
);

s = s.replace(
  '    // Persist current visual settings via the unified config manager\n    ConfigPersistenceManager.updateConfig({\n      theme: { mode: themeMode, presetId: activePresetId },\n      branding: { customLogo, customAccentColor }\n    });',
  '    // Persist current visual settings via the unified config manager\n    ConfigPersistenceManager.updateConfig({\n      theme: { mode: themeMode, presetId: activePresetId },\n      branding: { customLogo, customAccentColor }\n    });\n\n    // Persist to localStorage for index.html initial load script\n    localStorage.setItem(\'prodx_pos_theme_mode\', themeMode);\n    localStorage.setItem(\'prodx_pos_theme_preset\', activePresetId);\n    if (customAccentColor) {\n      localStorage.setItem(\'prodx_custom_accent_color\', customAccentColor);\n    } else {\n      localStorage.removeItem(\'prodx_custom_accent_color\');\n    }'
);

fs.writeFileSync('src/context/ThemeContext.tsx', s);
