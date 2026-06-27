"use client";

import { Box, Button, Flex, Input, List, Text, ThemeIcon } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconChecks, IconTrophy } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "./fetcher";
import WeightedWheel from "./WeightedWheel";

const WHEEL_ITEM_LIMIT = 6;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const VOTE_WEIGHTS = [
  { weight: 3, label: "Gold vote", color: "yellow" },
  { weight: 2, label: "Silver vote", color: "gray" },
  { weight: 1, label: "Bronze vote", color: "orange" },
];

const mainList = [
  { name: "CS2", maxPlayers: 20 },
  { name: "Wreckwest", maxPlayers: 24 },
  { name: "Fall Guys", maxPlayers: 32 },
  { name: "Golf it", maxPlayers: 8 },
  { name: "Human Fall Flat", maxPlayers: 8 },
  { name: "Mount&Blade Warband", maxPlayers: 200 },
  { name: "J-Jump Arena", maxPlayers: 10 },
  { name: "Just Act Natural", maxPlayers: 8 },
  { name: "Barotrauma", maxPlayers: 16 },
  { name: "Valheim", maxPlayers: 10 },
  { name: "Witch It", maxPlayers: 16 },
  { name: "Slappyball", maxPlayers: 6 },
  { name: "Chivalry 2", maxPlayers: 64 },
  { name: "Murderous Pursuits", maxPlayers: 8 },
  { name: "Muck", maxPlayers: 8 },
  { name: "Blackwake", maxPlayers: 54 },
  { name: "Hand simulator", maxPlayers: 8 },
  { name: "Against All Odds", maxPlayers: 20 },
  { name: "The Floor Is Still Really Cheap Lava", maxPlayers: 8 },
  { name: "Age of Empires IV", maxPlayers: 8 },
  { name: "Diabotical  (Epic games)", maxPlayers: 16 },
  { name: "Depth", maxPlayers: 6 },
  { name: "Left 4 Dead 2", maxPlayers: 8 },
  { name: "Party Animals", maxPlayers: 8 },
  { name: "ShellShock Live", maxPlayers: 8 },
  { name: "Transformice", maxPlayers: 200 },
  { name: "Oh Deer", maxPlayers: 5 },
  { name: "Crab Game", maxPlayers: 40 },
  { name: "Team Fortress 2", maxPlayers: 32 },
  { name: "Spellsworn", maxPlayers: 8 },
  { name: "Viscera Cleanup Detail", maxPlayers: 32 },
  { name: "Brawlhalla", maxPlayers: 8 },
  { name: "Palia", maxPlayers: 25 },
  { name: "Meccha Chameleon", maxPlayers: 24 },
  { name: "Robot Roller-Derby Disco Dodgeball", maxPlayers: 16 },
  { name: "Sneak Out", maxPlayers: 6 },
  { name: "Super Animal Royale", maxPlayers: 64 },
  { name: "Supraball", maxPlayers: 10 },
  { name: "Slapshot: Rebound", maxPlayers: 6 },
  { name: "PROJECT: PLAYTIME", maxPlayers: 7 },
  { name: "Scribble It!", maxPlayers: 16 },
  { name: "King of Crabs", maxPlayers: 100 },
  { name: "Pummel Party", maxPlayers: 8 },
  { name: "Retrocycles", maxPlayers: 16 },
  { name: "Valorant", maxPlayers: 10 },
  { name: "GeoGuesser", maxPlayers: 10 },
  { name: "Gartic Phone", maxPlayers: 30 },
  { name: "Peak", maxPlayers: 24 },
  { name: "League of Legends", maxPlayers: 10 },
  { name: "Sea of Thieves", maxPlayers: 24 },
  { name: "Escape Simulator", maxPlayers: 10 },
  { name: "Rooside sõda", maxPlayers: 12 },
];

function normalizeName(name) {
  return String(name ?? "").trim();
}

function toGameId(source, name) {
  return `${source}-${normalizeName(name).toLowerCase().replaceAll(/\s+/g, "-")}`;
}

function apiUrl(path) {
  if (!API_BASE_URL || typeof window === "undefined") return path;

  try {
    const configuredUrl = new URL(API_BASE_URL);
    if (configuredUrl.host !== window.location.host) return path;
  } catch {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

function showVoteSuccess(name, weight) {
  showNotification({
    title: `Voted ${name}`,
    message: weight ? `${weight} point vote updated.` : "Your vote was updated.",
    withBorder: true,
  });
}

function isActiveVote(myVotes, name, weight) {
  return normalizeName(myVotes?.[weight]) === normalizeName(name);
}

async function handleVoteClick(name, weight, voteForGame) {
  const didVote = await voteForGame(name, weight);
  if (didVote) showVoteSuccess(name, weight);
}

function getVoteListColor(index) {
  if (index === 0) return "yellow";
  if (index < WHEEL_ITEM_LIMIT) return "green";
  return "blue";
}

function getPlayedRecord(playedData, name) {
  return playedData?.games?.[normalizeName(name)] ?? { count: 0, lastPlayedAt: undefined };
}

function getMainListSnippet(name, maxPlayers) {
  const safeMaxPlayers = Number.isFinite(maxPlayers) ? maxPlayers : 0;
  return `{ name: ${JSON.stringify(normalizeName(name))}, maxPlayers: ${safeMaxPlayers} },`;
}

export default function Games() {
  const [customGames = []] = useLocalStorage({
    key: "your-games",
    defaultValue: [],
  });
  const [isAdmin, setIsAdmin] = useLocalStorage({
    key: "admin",
    defaultValue: "",
  });
  const [gameInput, setGameInput] = useState("");
  const [sortStatus, setSortStatus] = useState({
    columnAccessor: "name",
    direction: "asc",
  });

  const { data: results, mutate } = useSWR(apiUrl("/api/results"), fetcher, {
    refreshInterval: 1000,
  });
  const { data: playedData, mutate: mutatePlayed } = useSWR(apiUrl("/api/played"), fetcher, {
    refreshInterval: 5000,
  });

  const records = useMemo(() => {
    const customRecords = Array.isArray(customGames)
      ? customGames.map((game) => {
          const played = getPlayedRecord(playedData, game.name);
          return {
            ...game,
            id: toGameId("custom", game.name),
            source: "custom",
            playedCount: played.count,
            lastPlayedAt: played.lastPlayedAt,
          };
        })
      : [];
    const mainRecords = mainList.map((game) => {
      const played = getPlayedRecord(playedData, game.name);
      return {
        ...game,
        id: toGameId("main", game.name),
        source: "main",
        playedCount: played.count,
        lastPlayedAt: played.lastPlayedAt,
      };
    });
    const allRecords = [...customRecords, ...mainRecords];
    const mostPopularNames = new Set(
      [...allRecords]
        .filter((game) => (game.playedCount ?? 0) > 0)
        .sort((a, b) => (b.playedCount ?? 0) - (a.playedCount ?? 0) || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((game) => normalizeName(game.name))
    );

    return allRecords.map((game) => ({ ...game, isPopular: mostPopularNames.has(normalizeName(game.name)) })).sort((a, b) => {
      const direction = sortStatus.direction === "asc" ? 1 : -1;

      if (sortStatus.columnAccessor === "maxPlayers") {
        const aPlayers = Number.isFinite(a.maxPlayers) ? a.maxPlayers : Number.POSITIVE_INFINITY;
        const bPlayers = Number.isFinite(b.maxPlayers) ? b.maxPlayers : Number.POSITIVE_INFINITY;
        return (aPlayers - bPlayers || a.name.localeCompare(b.name)) * direction;
      }

      if (sortStatus.columnAccessor === "playedCount") {
        return ((a.playedCount ?? 0) - (b.playedCount ?? 0) || a.name.localeCompare(b.name)) * direction;
      }

      return a.name.localeCompare(b.name) * direction;
    });
  }, [customGames, playedData, sortStatus]);

  const topGames = useMemo(
    () => (results?.votes ?? []).slice(0, WHEEL_ITEM_LIMIT),
    [results?.votes]
  );

  const voteForGame = async (gameName, weight = 3) => {
    const name = normalizeName(gameName ?? gameInput);
    if (!name) {
      showNotification({
        title: "Game name required",
        message: "Enter a game name before adding a vote.",
        color: "red",
        withBorder: true,
      });
      return false;
    }

    const response = await fetch(apiUrl("/api/vote"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, weight }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showNotification({
        title: "Vote was not updated",
        message: error.error ?? "Please try again.",
        color: "red",
        withBorder: true,
      });
      return false;
    }

    const voteResult = await response.json();
    if (!gameName) setGameInput("");
    await mutate((currentResults) => ({ ...currentResults, ...voteResult }), {
      revalidate: true,
    });
    return true;
  };

  const markPlayed = async (gameName) => {
    const name = normalizeName(gameName);
    if (!name) return;

    const response = await fetch(apiUrl("/api/played"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showNotification({
        title: "Played game was not saved",
        message: error.error ?? "Please try again.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const nextPlayedData = await response.json();
    await mutatePlayed(nextPlayedData, { revalidate: false });
    showNotification({
      title: "Marked as played",
      message: name,
      withBorder: true,
    });
  };

  const copyMainListSnippet = async (game) => {
    const snippet = getMainListSnippet(game.name, game.maxPlayers);

    try {
      await navigator.clipboard.writeText(snippet);
      showNotification({
        title: "Main list object copied",
        message: snippet,
        withBorder: true,
      });
    } catch {
      showNotification({
        title: "Could not copy game object",
        message: snippet,
        color: "red",
        withBorder: true,
      });
    }
  };

  const clearVotes = async () => {
    await fetch(apiUrl("/api/vote"), {
      method: "DELETE",
    });
    await mutate();
  };

  const sendWheel = async () => {
    const response = await fetch(apiUrl("/api/vote"), {
      method: "PUT",
    });
    const nextResults = await response.json();

    await mutate((currentResults) => ({ ...currentResults, ...nextResults }), {
      revalidate: true,
    });
  };

  return (
    <div>
      <Flex className="games-layout">
        <div className="games-list-panel">
          <div className="custom-vote-form">
            <Text>Vote for custom game</Text>
            <Flex gap="xs">
              <Input
                aria-label="Custom game name"
                value={gameInput}
                onChange={(event) => setGameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") voteForGame();
                }}
              />
              <Button onClick={() => voteForGame()}>Add</Button>
              {isAdmin !== "1" && <Button onClick={() => setIsAdmin("1")}>Make admin</Button>}
              {isAdmin === "1" && (
                <Button color="red" onClick={clearVotes}>
                  Clear votes
                </Button>
              )}
            </Flex>
          </div>
          <DataTable
            withTableBorder
            borderRadius="sm"
            striped
            highlightOnHover
            idAccessor="id"
            records={records}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            columns={[
              {
                accessor: "name",
                sortable: true,
                render: (record) => (
                  <span className="game-name-cell">
                    <span className="game-name-text">{record.name}</span>
                    {record.isPopular && (
                      <span aria-label="Top 8 most popular game" className="game-popular-marker" title="Top 8 most popular">
                        🔥
                      </span>
                    )}
                    {record.source === "custom" && (
                      <button
                        aria-label={`Copy ${record.name} as main list object`}
                        className="copy-game-object"
                        onClick={(event) => {
                          event.stopPropagation();
                          copyMainListSnippet(record);
                        }}
                        title="Copy mainList object"
                        type="button"
                      >
                        💡
                      </button>
                    )}
                  </span>
                ),
              },
              {
                accessor: "maxPlayers",
                sortable: true,
                render: ({ maxPlayers }) => maxPlayers ?? "???",
              },
              {
                accessor: "playedCount",
                sortable: true,
                title: "Popularity",
                render: ({ playedCount }) => playedCount ?? 0,
              },
              {
                accessor: "actions",
                render: ({ name }) => (
                  <Box className="ranked-vote-actions">
                    {VOTE_WEIGHTS.map(({ weight, label, color }) => {
                      const active = isActiveVote(results?.myVotes, name, weight);

                      return (
                        <Button
                          aria-label={`${label} for ${name}`}
                          color={active ? "orange" : color}
                          key={weight}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleVoteClick(name, weight, voteForGame);
                          }}
                          size="xs"
                          title={`${weight} point ${label.toLowerCase()}`}
                          variant={active ? "filled" : "light"}
                        >
                          <IconTrophy size={16} />
                          {weight}
                        </Button>
                      );
                    })}
                    {isAdmin === "1" && (
                      <Button
                        aria-label={`Mark ${name} as played`}
                        color="teal"
                        onClick={(event) => {
                          event.stopPropagation();
                          markPlayed(name);
                        }}
                        size="xs"
                        title="Mark as played"
                        variant="light"
                      >
                        <IconChecks size={16} />
                        Played
                      </Button>
                    )}
                  </Box>
                ),
              },
            ]}
          />
        </div>
        <Flex className="results-panel" direction="column">
          <WeightedWheel
            ariaLabel="Weighted vote wheel"
            isAdmin={isAdmin === "1"}
            items={topGames}
            onSpin={sendWheel}
            spinAngle={results?.spinAngle}
          />
          <div className="top-votes">
            <Text>Top votes:</Text>
            <List className="top-votes-list" listStyleType="none" spacing="xs">
              {results?.votes?.map((vote, index) => (
                <List.Item
                  className={index < WHEEL_ITEM_LIMIT ? "top-vote top-vote-large" : "top-vote"}
                  icon={
                    <ThemeIcon color={getVoteListColor(index)} radius="xl" size={index < WHEEL_ITEM_LIMIT ? "lg" : "md"}>
                      {index + 1}
                    </ThemeIcon>
                  }
                  key={`${normalizeName(vote.name).toLowerCase()}-${index}`}
                >
                  <div className="top-vote-content">
                    <span className="top-vote-name">{vote.name}</span>
                    <span className="top-vote-score">{vote.votes}</span>
                    {isAdmin === "1" && (
                      <Button
                        aria-label={`Mark ${vote.name} as played`}
                        color="teal"
                        onClick={() => markPlayed(vote.name)}
                        size="xs"
                        variant="light"
                      >
                        <IconChecks size={16} />
                        Played
                      </Button>
                    )}
                  </div>
                </List.Item>
              ))}
            </List>
          </div>
        </Flex>
      </Flex>
    </div>
  );
}
