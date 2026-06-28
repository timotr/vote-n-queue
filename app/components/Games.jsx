"use client";

import { Box, Button, Flex, Input, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconChecks, IconTrophy } from "@tabler/icons-react";
import { DataTable } from "mantine-datatable";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import AdminLogin from "./AdminLogin";
import { fetcher } from "./fetcher";
import WeightedWheel from "./WeightedWheel";

const WHEEL_ITEM_LIMIT = 6;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const VOTE_WEIGHTS = [
  { weight: 3, label: "Gold vote", color: "yellow" },
  { weight: 2, label: "Silver vote", color: "gray" },
  { weight: 1, label: "Bronze vote", color: "orange" },
];

function normalizeName(name) {
  return String(name ?? "").trim();
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
  return normalizeName(myVotes?.[weight]).toLowerCase() === normalizeName(name).toLowerCase();
}

async function handleVoteClick(name, weight, voteForGame) {
  const didVote = await voteForGame(name, weight);
  if (didVote) showVoteSuccess(name, weight);
}

function getPlayedRecord(playedData, name) {
  return playedData?.games?.[normalizeName(name)] ?? { count: 0, lastPlayedAt: undefined };
}

function getLaunchHref(game) {
  if (game?.steamAppId) return `steam://run/${game.steamAppId}`;
  if (game?.gameUrl) return game.gameUrl;
  return "";
}

function LaunchLink({ game }) {
  const href = getLaunchHref(game);
  if (!href) return null;

  return (
    <a
      aria-label={`Launch ${game.name}`}
      className="game-launch-link"
      href={href}
      rel={game.gameUrl ? "noreferrer" : undefined}
      target={game.gameUrl ? "_blank" : undefined}
      title={game.steamAppId ? `Launch ${game.name} with Steam` : `Open ${game.name}`}
    >
      {href.startsWith("steam") ? 
        <img src="steam.svg" className="steamicon" />
        :
        <>🌍</>
      }
    </a>
  );
}

function EditableGameInput({ ariaLabel, className = "", value, onCommit, placeholder = "" }) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const commit = () => {
    const nextValue = String(draft ?? "").trim();
    if (nextValue !== String(value ?? "").trim()) onCommit(nextValue);
  };

  return (
    <input
      aria-label={ariaLabel}
      className={`game-inline-input ${className}`}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value ?? "");
          event.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      value={draft}
    />
  );
}

function VoteButtons({ myVotes, name, voteForGame }) {
  return (
    <>
      {VOTE_WEIGHTS.map(({ weight, label, color }) => {
        const active = isActiveVote(myVotes, name, weight);

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
    </>
  );
}

export default function Games() {
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
  const { data: gamesData, mutate: mutateGames } = useSWR(apiUrl("/api/games"), fetcher, {
    refreshInterval: 5000,
  });

  const records = useMemo(() => {
    const allRecords = (gamesData?.games ?? []).map((game) => {
      const played = getPlayedRecord(playedData, game.name);
      return {
        ...game,
        playedCount: played.count,
        lastPlayedAt: played.lastPlayedAt,
      };
    });
    const mostPopularNames = new Set(
      [...allRecords]
        .filter((game) => (game.playedCount ?? 0) > 0)
        .sort((a, b) => (b.playedCount ?? 0) - (a.playedCount ?? 0) || a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((game) => normalizeName(game.name).toLowerCase())
    );

    return allRecords
      .map((game) => ({ ...game, isPopular: mostPopularNames.has(normalizeName(game.name).toLowerCase()) }))
      .sort((a, b) => {
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
  }, [gamesData, playedData, sortStatus]);

  const topGames = useMemo(
    () => (results?.votes ?? []).slice(0, WHEEL_ITEM_LIMIT),
    [results?.votes]
  );
  const gamesByName = useMemo(
    () =>
      new Map(
        (gamesData?.games ?? []).map((game) => [
          normalizeName(game.name).toLowerCase(),
          game,
        ])
      ),
    [gamesData]
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
    await mutate((currentResults) => ({ ...currentResults, ...voteResult }), {
      revalidate: true,
    });
    return true;
  };

  const addGameAndVote = async () => {
    const name = normalizeName(gameInput);
    if (!name) {
      showNotification({
        title: "Game name required",
        message: "Enter a game name before adding a vote.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const response = await fetch(apiUrl("/api/games"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showNotification({
        title: "Game was not added",
        message: error.error ?? "Please try another name.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const nextGamesData = await response.json();
    await mutateGames(nextGamesData, { revalidate: false });
    const didVote = await voteForGame(nextGamesData.game.name, 3);
    if (didVote) {
      setGameInput("");
      showVoteSuccess(nextGamesData.game.name, 3);
    }
  };

  const updateGame = async (record, patch) => {
    const response = await fetch(apiUrl("/api/games"), {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...record, ...patch }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) setIsAdmin("");
      showNotification({
        title: "Game was not saved",
        message: error.error ?? "Please try again.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const nextGamesData = await response.json();
    await mutateGames(nextGamesData, { revalidate: false });
    await mutate();
    await mutatePlayed();
  };

  const markPlayed = async (gameName) => {
    const name = normalizeName(gameName);
    if (!name) return;

    const response = await fetch(apiUrl("/api/played"), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) setIsAdmin("");
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

  const clearVotes = async () => {
    const response = await fetch(apiUrl("/api/vote"), {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.status === 401) {
      setIsAdmin("");
      return;
    }
    await mutate();
  };

  const sendWheel = async () => {
    const response = await fetch(apiUrl("/api/vote"), {
      method: "PUT",
      credentials: "same-origin",
    });
    if (response.status === 401) {
      setIsAdmin("");
      return;
    }
    const nextResults = await response.json();

    await mutate((currentResults) => ({ ...currentResults, ...nextResults }), {
      revalidate: true,
    });
  };

  const columns = [
    {
      accessor: "name",
      sortable: true,
      render: (record) => (
        <span className="game-name-cell">
          {isAdmin === "1" ? (
            <EditableGameInput
              ariaLabel={`Name for ${record.name}`}
              className="game-name-edit"
              onCommit={(name) => updateGame(record, { name })}
              value={record.name}
            />
          ) : (
            <span className="game-name-text">{record.name}</span>
          )}
          <LaunchLink game={record} />
          {record.isPopular && (
            <span aria-label="Top 8 most popular game" className="game-popular-marker" title="Top 8 most popular">
              🔥
            </span>
          )}
        </span>
      ),
    },
    {
      accessor: "maxPlayers",
      sortable: true,
      render: (record) =>
        isAdmin === "1" ? (
          <EditableGameInput
            ariaLabel={`Max players for ${record.name}`}
            className="game-number-edit"
            onCommit={(maxPlayers) => updateGame(record, { maxPlayers })}
            placeholder="?"
            value={record.maxPlayers ?? ""}
          />
        ) : (
          record.maxPlayers ?? "???"
        ),
    },
    {
      accessor: "playedCount",
      sortable: true,
      title: "Popularity",
      render: ({ playedCount }) => playedCount ?? 0,
    },
    ...(isAdmin === "1"
      ? [
          {
            accessor: "steamAppId",
            title: "Steam",
            render: (record) => (
              <EditableGameInput
                ariaLabel={`Steam app ID for ${record.name}`}
                className="game-steam-edit"
                onCommit={(steamAppId) => updateGame(record, { steamAppId })}
                placeholder="App ID"
                value={record.steamAppId ?? ""}
              />
            ),
          },
          {
            accessor: "gameUrl",
            title: "URL",
            render: (record) => (
              <EditableGameInput
                ariaLabel={`Game URL for ${record.name}`}
                className="game-url-edit"
                onCommit={(gameUrl) => updateGame(record, { gameUrl })}
                placeholder="https://"
                value={record.gameUrl ?? ""}
              />
            ),
          },
        ]
      : []),
    {
      accessor: "actions",
      render: ({ name }) => (
        <Box className="ranked-vote-actions">
          <VoteButtons myVotes={results?.myVotes} name={name} voteForGame={voteForGame} />
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
  ];

  return (
    <div>
      <Flex className="games-layout">
        <div className="games-list-panel">
          <div className="custom-vote-form">
            <Text>Vote for custom game</Text>
            <Flex gap="xs">
              <Input
                aria-label="Custom game name"
                onChange={(event) => setGameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") addGameAndVote();
                }}
                value={gameInput}
              />
              <Button onClick={addGameAndVote}>Add</Button>
              <AdminLogin apiUrl={apiUrl} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
              {isAdmin === "1" && (
                <Button color="red" onClick={clearVotes}>
                  Clear votes
                </Button>
              )}
            </Flex>
          </div>
          <DataTable
            borderRadius="sm"
            highlightOnHover
            idAccessor="id"
            onSortStatusChange={setSortStatus}
            records={records}
            sortStatus={sortStatus}
            striped
            withTableBorder
            columns={columns}
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
            <Text fw={700}>Top votes</Text>
            <div className="top-votes-table">
              {results?.votes?.map((vote, index) => {
                const game = gamesByName.get(normalizeName(vote.name).toLowerCase());

                return (
                  <div
                    className={index < WHEEL_ITEM_LIMIT ? "top-vote-row top-vote-row-large" : "top-vote-row"}
                    key={`${normalizeName(vote.name).toLowerCase()}-${index}`}
                  >
                    <span className="top-vote-rank">{index + 1}</span>
                    <div className="top-vote-game">
                      <span className="top-vote-name">{vote.name}</span>
                      {game && <LaunchLink game={game} />}
                    </div>
                    <span className="top-vote-score">📊&nbsp;{vote.votes}</span>
                    <Box className="ranked-vote-actions top-vote-actions">
                      <VoteButtons myVotes={results?.myVotes} name={vote.name} voteForGame={voteForGame} />
                    </Box>
                    <div className="top-vote-admin-action">
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
                  </div>
                );
              })}
            </div>
          </div>
        </Flex>
      </Flex>
    </div>
  );
}
