import fs from "fs";

const SETTINGS_FILE = "settings-store.json";
const DEFAULT_SETTINGS = {
  allowSameGameRankedVotes: false,
};

function normalizeSettings(settings) {
  return {
    allowSameGameRankedVotes: settings?.allowSameGameRankedVotes === true,
  };
}

export function getSettings() {
  try {
    const file = fs.readFileSync(SETTINGS_FILE, "utf8");
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...(file ? JSON.parse(file) : {}) });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateSettings(nextSettings) {
  const settings = normalizeSettings({ ...getSettings(), ...nextSettings });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}
