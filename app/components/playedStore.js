import fs from 'fs';

const PLAYED_STORE_FILE = 'played-store.json';

function normalizeName(name) {
  return String(name ?? '').trim();
}

function createEmptyStore() {
  return {
    games: {},
    events: [],
  };
}

function readPlayedStore() {
  try {
    const file = fs.readFileSync(PLAYED_STORE_FILE, 'utf8');
    const parsed = file ? JSON.parse(file) : createEmptyStore();

    return {
      games: parsed.games ?? {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return createEmptyStore();
  }
}

function writePlayedStore(store) {
  fs.writeFileSync(PLAYED_STORE_FILE, JSON.stringify(store));
}

export function getPlayedData() {
  const store = readPlayedStore();

  return {
    games: store.games,
    recent: [...store.events].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt)),
  };
}

export function markGamePlayed(name) {
  const gameName = normalizeName(name);
  if (!gameName) {
    return undefined;
  }

  const store = readPlayedStore();
  const playedAt = new Date().toISOString();
  const current = store.games[gameName] ?? { count: 0, lastPlayedAt: undefined };

  store.games[gameName] = {
    count: current.count + 1,
    lastPlayedAt: playedAt,
  };
  store.events.push({ name: gameName, playedAt });
  writePlayedStore(store);

  return getPlayedData();
}
