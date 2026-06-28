import { randomUUID } from "node:crypto";
import fs from "fs";

const GAMES_FILE = "games-list.json";

function normalizeName(name) {
  return String(name ?? "").trim();
}

function normalizeKey(name) {
  return normalizeName(name).toLowerCase();
}

function slugify(name) {
  const slug = normalizeName(name)
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
  return slug || randomUUID();
}

function readGamesFile() {
  try {
    const file = fs.readFileSync(GAMES_FILE, "utf8");
    const parsed = file ? JSON.parse(file) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeGame).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeGamesFile(games) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games.map(normalizeGame).filter(Boolean), null, 2));
}

function normalizeNullableString(value) {
  const normalizedValue = normalizeName(value);
  return normalizedValue || null;
}

function normalizeMaxPlayers(value) {
  if (value === null || value === undefined || value === "") return null;

  const maxPlayers = Number(value);
  if (!Number.isFinite(maxPlayers) || maxPlayers <= 0) return null;
  return Math.round(maxPlayers);
}

function normalizeSteamAppId(value) {
  const steamAppId = normalizeNullableString(value);
  if (!steamAppId) return null;
  return /^\d+$/.test(steamAppId) ? steamAppId : null;
}

function normalizeGameUrl(value) {
  const gameUrl = normalizeNullableString(value);
  if (!gameUrl) return null;

  try {
    const url = new URL(gameUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeGame(game) {
  const name = normalizeName(game?.name);
  if (!name) return undefined;

  return {
    id: normalizeName(game.id) || slugify(name),
    name,
    maxPlayers: normalizeMaxPlayers(game.maxPlayers),
    steamAppId: normalizeSteamAppId(game.steamAppId),
    gameUrl: normalizeGameUrl(game.gameUrl),
  };
}

function hasDuplicateName(games, name, ignoredId) {
  const key = normalizeKey(name);
  return games.some((game) => game.id !== ignoredId && normalizeKey(game.name) === key);
}

export function getGames() {
  return readGamesFile();
}

export function addGame(name) {
  const gameName = normalizeName(name);
  if (!gameName) {
    return { error: "Game name is required", status: 400 };
  }

  const games = readGamesFile();
  if (hasDuplicateName(games, gameName)) {
    return { error: "Game already exists", status: 409 };
  }

  const existingIds = new Set(games.map((game) => game.id));
  let id = slugify(gameName);
  if (existingIds.has(id)) id = `${id}-${randomUUID().slice(0, 8)}`;

  const game = normalizeGame({
    id,
    name: gameName,
    maxPlayers: null,
    steamAppId: null,
    gameUrl: null,
  });
  const nextGames = [...games, game];
  writeGamesFile(nextGames);

  return { games: nextGames, game };
}

export function updateGame(payload) {
  const gameId = normalizeName(payload?.id);
  const nextName = normalizeName(payload?.name);

  if (!gameId) return { error: "Game ID is required", status: 400 };
  if (!nextName) return { error: "Game name is required", status: 400 };

  const games = readGamesFile();
  const index = games.findIndex((game) => game.id === gameId);
  if (index === -1) return { error: "Game was not found", status: 404 };
  if (hasDuplicateName(games, nextName, gameId)) return { error: "Game already exists", status: 409 };

  const previousGame = games[index];
  const nextGame = normalizeGame({
    ...previousGame,
    name: nextName,
    maxPlayers: payload.maxPlayers,
    steamAppId: payload.steamAppId,
    gameUrl: payload.gameUrl,
  });

  const nextGames = [...games];
  nextGames[index] = nextGame;
  writeGamesFile(nextGames);

  return { games: nextGames, game: nextGame, previousName: previousGame.name };
}
