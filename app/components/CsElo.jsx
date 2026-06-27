"use client";

import { ActionIcon, Button, Flex, Group, Text } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconArrowLeft, IconArrowRight, IconDownload, IconFileImport, IconPlus } from "@tabler/icons-react";
import { useLocalStorage } from "@mantine/hooks";
import { useMemo, useRef, useState } from "react";

const STORAGE_KEY = "cs-elo-teams";
const DEFAULT_SCORE = 60;
const SCORE_DRAG_PIXELS_PER_STEP = 3;
const TEAM_KEYS = ["left", "right"];
const DEFAULT_STATE = {
  teams: {
    left: { name: "Team A", players: [] },
    right: { name: "Team B", players: [] },
  },
};

function createPlayer() {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    name: "New player",
    score: DEFAULT_SCORE,
  };
}

function normalizeScore(score) {
  const parsed = Number(score);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function sortPlayers(players) {
  return [...players].sort((a, b) => normalizeScore(b.score) - normalizeScore(a.score) || a.name.localeCompare(b.name));
}

function normalizePlayer(player) {
  return {
    id: player?.id ?? createPlayer().id,
    name: String(player?.name ?? "New player"),
    score: normalizeScore(player?.score ?? DEFAULT_SCORE),
  };
}

function normalizeState(value) {
  return {
    teams: {
      left: {
        name: value?.teams?.left?.name ?? DEFAULT_STATE.teams.left.name,
        players: Array.isArray(value?.teams?.left?.players) ? value.teams.left.players.map(normalizePlayer) : [],
      },
      right: {
        name: value?.teams?.right?.name ?? DEFAULT_STATE.teams.right.name,
        players: Array.isArray(value?.teams?.right?.players) ? value.teams.right.players.map(normalizePlayer) : [],
      },
    },
  };
}

function getDragStep(event) {
  if (event.ctrlKey) return 10;
  if (event.shiftKey) return 5;
  return 1;
}

function getTeamTotal(team) {
  return team.players.reduce((sum, player) => sum + normalizeScore(player.score), 0);
}

function findPlayerLocation(state, playerId) {
  for (const teamKey of TEAM_KEYS) {
    const player = state.teams[teamKey].players.find((teamPlayer) => teamPlayer.id === playerId);
    if (player) return { teamKey, player };
  }

  return undefined;
}

function downloadJson(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function CsElo() {
  const [storedState, setStoredState] = useLocalStorage({
    key: STORAGE_KEY,
    defaultValue: DEFAULT_STATE,
  });
  const state = useMemo(() => normalizeState(storedState), [storedState]);
  const dragRef = useRef(null);
  const draggedSwapRef = useRef(null);
  const scoreEditRef = useRef(null);
  const importFileRef = useRef(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [importText, setImportText] = useState("");
  const [dropTarget, setDropTarget] = useState(null);

  const updateState = (updater) => {
    setStoredState((current) => updater(normalizeState(current)));
  };

  const updatePlayer = (teamKey, playerId, changes) => {
    updateState((current) => ({
      teams: {
        ...current.teams,
        [teamKey]: {
          ...current.teams[teamKey],
          players: current.teams[teamKey].players.map((player) =>
            player.id === playerId ? { ...player, ...changes } : player
          ),
        },
      },
    }));
  };

  const pushScoreHistory = (edit) => {
    setUndoStack((current) => [...current, edit].slice(-30));
    setRedoStack([]);
  };

  const beginScoreUndo = (teamKey, player) => {
    if (scoreEditRef.current?.teamKey === teamKey && scoreEditRef.current?.playerId === player.id) return;

    scoreEditRef.current = {
      teamKey,
      playerId: player.id,
      previousScore: normalizeScore(player.score),
    };
  };

  const commitScoreUndo = () => {
    const edit = scoreEditRef.current;
    if (!edit) return;

    scoreEditRef.current = null;
    const currentLocation = findPlayerLocation(state, edit.playerId);
    if (!currentLocation || normalizeScore(currentLocation.player.score) === edit.previousScore) return;

    pushScoreHistory({
      ...edit,
      nextScore: normalizeScore(currentLocation.player.score),
    });
  };

  const undoScoreChange = () => {
    const edit = undoStack.at(-1);
    if (!edit) return;

    const currentLocation = findPlayerLocation(state, edit.playerId);
    if (currentLocation) {
      updatePlayer(currentLocation.teamKey, edit.playerId, { score: edit.previousScore });
      sortTeams();
      setRedoStack((current) =>
        [
          ...current,
          {
            ...edit,
            nextScore: normalizeScore(currentLocation.player.score),
          },
        ].slice(-30)
      );
    }
    setUndoStack((current) => current.slice(0, -1));
  };

  const changeScoreByPercent = (teamKey, player, multiplier) => {
    commitScoreUndo();
    const previousScore = normalizeScore(player.score);
    const nextScore = normalizeScore(previousScore * multiplier);
    if (nextScore === previousScore) return;

    pushScoreHistory({
      teamKey,
      playerId: player.id,
      previousScore,
      nextScore,
    });
    updatePlayer(teamKey, player.id, { score: nextScore });
    sortTeams();
  };

  const redoScoreChange = () => {
    const edit = redoStack.at(-1);
    if (!edit) return;

    const currentLocation = findPlayerLocation(state, edit.playerId);
    if (currentLocation) {
      updatePlayer(currentLocation.teamKey, edit.playerId, { score: edit.nextScore });
      sortTeams();
      setUndoStack((current) =>
        [
          ...current,
          {
            ...edit,
            previousScore: normalizeScore(currentLocation.player.score),
          },
        ].slice(-30)
      );
    }
    setRedoStack((current) => current.slice(0, -1));
  };

  const handleKeyboardUndo = (event) => {
    if (!event.ctrlKey || event.key.toLowerCase() !== "z") return;
    if (event.target?.classList?.contains("cs-elo-name")) return;

    event.preventDefault();
    if (event.shiftKey) {
      redoScoreChange();
    } else {
      undoScoreChange();
    }
  };

  const addPlayer = (teamKey) => {
    updateState((current) => ({
      teams: {
        ...current.teams,
        [teamKey]: {
          ...current.teams[teamKey],
          players: [...current.teams[teamKey].players, createPlayer()],
        },
      },
    }));
  };

  const sortTeams = () => {
    updateState((current) => ({
      teams: {
        left: { ...current.teams.left, players: sortPlayers(current.teams.left.players) },
        right: { ...current.teams.right, players: sortPlayers(current.teams.right.players) },
      },
    }));
  };

  const movePlayer = (fromTeamKey, playerId) => {
    const toTeamKey = fromTeamKey === "left" ? "right" : "left";

    updateState((current) => {
      const movingPlayer = current.teams[fromTeamKey].players.find((player) => player.id === playerId);
      if (!movingPlayer) return current;

      return {
        teams: {
          ...current.teams,
          [fromTeamKey]: {
            ...current.teams[fromTeamKey],
            players: sortPlayers(current.teams[fromTeamKey].players.filter((player) => player.id !== playerId)),
          },
          [toTeamKey]: {
            ...current.teams[toTeamKey],
            players: sortPlayers([...current.teams[toTeamKey].players, movingPlayer]),
          },
        },
      };
    });
  };

  const swapPlayersBetweenTeams = (fromTeamKey, fromPlayerId, toTeamKey, toPlayerId) => {
    if (fromTeamKey === toTeamKey || fromPlayerId === toPlayerId) return;

    updateState((current) => {
      const fromPlayer = current.teams[fromTeamKey].players.find((player) => player.id === fromPlayerId);
      const toPlayer = current.teams[toTeamKey].players.find((player) => player.id === toPlayerId);
      if (!fromPlayer || !toPlayer) return current;

      return {
        teams: {
          ...current.teams,
          [fromTeamKey]: {
            ...current.teams[fromTeamKey],
            players: sortPlayers([
              ...current.teams[fromTeamKey].players.filter((player) => player.id !== fromPlayerId),
              toPlayer,
            ]),
          },
          [toTeamKey]: {
            ...current.teams[toTeamKey],
            players: sortPlayers([
              ...current.teams[toTeamKey].players.filter((player) => player.id !== toPlayerId),
              fromPlayer,
            ]),
          },
        },
      };
    });
  };

  const isValidSwapTarget = (teamKey, playerId) => {
    const draggedPlayer = draggedSwapRef.current;
    return Boolean(draggedPlayer && draggedPlayer.fromTeamKey !== teamKey && draggedPlayer.playerId !== playerId);
  };

  const startSwapDrag = (event, fromTeamKey, playerId) => {
    draggedSwapRef.current = { fromTeamKey, playerId };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", playerId);
  };

  const clearSwapDrag = () => {
    draggedSwapRef.current = null;
    setDropTarget(null);
  };

  const handleSwapDragOver = (event, teamKey, playerId) => {
    if (!isValidSwapTarget(teamKey, playerId)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(`${teamKey}-${playerId}`);
  };

  const handleSwapDrop = (event, teamKey, playerId) => {
    if (!isValidSwapTarget(teamKey, playerId)) return;

    event.preventDefault();
    const draggedPlayer = draggedSwapRef.current;
    swapPlayersBetweenTeams(draggedPlayer.fromTeamKey, draggedPlayer.playerId, teamKey, playerId);
    clearSwapDrag();
  };

  const exportTeams = async () => {
    const serialized = JSON.stringify(state, null, 2);

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API is unavailable");
      }

      await navigator.clipboard.writeText(serialized);
      showNotification({
        title: "CS ELO exported",
        message: "Copied team data as JSON.",
        withBorder: true,
      });
    } catch {
      downloadJson("cs-elo-teams.json", serialized);
      showNotification({
        title: "CS ELO exported",
        message: "Clipboard was blocked, so a JSON file was downloaded instead.",
        withBorder: true,
      });
    }
  };

  const importTeamsFromJson = (serialized) => {
    try {
      const importedState = normalizeState(JSON.parse(serialized));
      setStoredState(importedState);
      setUndoStack([]);
      setRedoStack([]);
      scoreEditRef.current = null;
      setImportText("");
      showNotification({
        title: "CS ELO imported",
        message: "Team data was loaded.",
        withBorder: true,
      });
    } catch {
      showNotification({
        title: "Import failed",
        message: "Paste or choose a valid CS ELO JSON export.",
        color: "red",
        withBorder: true,
      });
    }
  };

  const importTeamsFromFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      importTeamsFromJson(await file.text());
    } catch {
      showNotification({
        title: "Import failed",
        message: "Could not read the selected file.",
        color: "red",
        withBorder: true,
      });
    }
  };

  const startScoreDrag = (event, teamKey, player) => {
    if (event.button !== 0) return;
    beginScoreUndo(teamKey, player);

    dragRef.current = {
      teamKey,
      playerId: player.id,
      pointerId: event.pointerId,
      startY: event.clientY,
      startScore: normalizeScore(player.score),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateScoreDrag = (event, teamKey, playerId) => {
    const drag = dragRef.current;
    if (!drag || drag.teamKey !== teamKey || drag.playerId !== playerId) return;

    const distance = drag.startY - event.clientY;
    const steps = Math.trunc(distance / SCORE_DRAG_PIXELS_PER_STEP);
    updatePlayer(teamKey, playerId, {
      score: normalizeScore(drag.startScore + steps * getDragStep(event)),
    });
  };

  const stopScoreDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      commitScoreUndo();
      sortTeams();
    }
  };

  return (
    <div className="cs-elo" onKeyDown={handleKeyboardUndo}>
      <Group justify="space-between" className="cs-elo-toolbar">
        <Text fw={700}>CS ELO</Text>
        <Group gap="xs">
          <input
            accept="application/json,.json"
            aria-label="Import CS ELO JSON file"
            className="cs-elo-file-input"
            onChange={importTeamsFromFile}
            ref={importFileRef}
            type="file"
          />
          <Button leftSection={<IconFileImport size={16} />} onClick={() => importFileRef.current?.click()} variant="light">
            Import file
          </Button>
          <Button leftSection={<IconDownload size={16} />} onClick={exportTeams} variant="light">
            Export
          </Button>
        </Group>
      </Group>

      <div className="cs-elo-import-text">
        <textarea
          aria-label="Paste CS ELO JSON"
          onChange={(event) => setImportText(event.target.value)}
          placeholder="Paste CS ELO JSON"
          value={importText}
        />
        <Button disabled={!importText.trim()} onClick={() => importTeamsFromJson(importText)} variant="light">
          Import text
        </Button>
      </div>

      <div className="cs-elo-teams">
        {TEAM_KEYS.map((teamKey) => (
          <section className="cs-elo-team" key={teamKey}>
            <Flex align="baseline" justify="space-between" className="cs-elo-team-header">
              <div>
                <Text fw={700}>{state.teams[teamKey].name}</Text>
                <Text c="dimmed" size="sm">
                  Total score
                </Text>
              </div>
              <Text className="cs-elo-total">{getTeamTotal(state.teams[teamKey])}</Text>
            </Flex>

            <div className="cs-elo-table-wrap">
              <table className="cs-elo-table">
                <thead>
                  <tr>
                    {teamKey === "right" && <th aria-label="Move player" className="cs-elo-move-column" />}
                    <th aria-label="Player order" className="cs-elo-order-column" />
                    <th className="cs-elo-name-column">Player</th>
                    <th className="cs-elo-score-column">Score</th>
                    {teamKey === "left" && <th aria-label="Move player" className="cs-elo-move-column" />}
                  </tr>
                </thead>
                <tbody>
                  {state.teams[teamKey].players.map((player, index) => (
                    <tr
                      className={dropTarget === `${teamKey}-${player.id}` ? "cs-elo-swap-target" : undefined}
                      key={player.id}
                      onDragLeave={() => {
                        if (dropTarget === `${teamKey}-${player.id}`) setDropTarget(null);
                      }}
                      onDragOver={(event) => handleSwapDragOver(event, teamKey, player.id)}
                      onDrop={(event) => handleSwapDrop(event, teamKey, player.id)}
                    >
                      {teamKey === "right" && (
                        <td className="cs-elo-move-column">
                          <ActionIcon
                            aria-label={`Move ${player.name} to ${state.teams.left.name}`}
                            className="cs-elo-swap-handle"
                            draggable
                            onDragEnd={clearSwapDrag}
                            onDragStart={(event) => startSwapDrag(event, teamKey, player.id)}
                            onClick={() => movePlayer(teamKey, player.id)}
                            variant="light"
                          >
                            <IconArrowLeft size={16} />
                          </ActionIcon>
                        </td>
                      )}
                      <td className="cs-elo-order-column">{index + 1}</td>
                      <td className="cs-elo-name-column">
                        <input
                          aria-label="Player name"
                          className="cs-elo-name"
                          onBlur={(event) => {
                            if (!event.target.value.trim()) updatePlayer(teamKey, player.id, { name: "New player" });
                          }}
                          onChange={(event) => updatePlayer(teamKey, player.id, { name: event.target.value })}
                          type="text"
                          value={player.name}
                        />
                      </td>
                      <td className="cs-elo-score-column">
                        <div className="cs-elo-score-control">
                          <input
                            aria-label={`${player.name} score`}
                            className="cs-elo-score"
                            inputMode="numeric"
                            onBlur={() => {
                              commitScoreUndo();
                              sortTeams();
                            }}
                            onChange={(event) => updatePlayer(teamKey, player.id, { score: normalizeScore(event.target.value) })}
                            onPointerCancel={stopScoreDrag}
                            onPointerDown={(event) => startScoreDrag(event, teamKey, player)}
                            onFocus={() => beginScoreUndo(teamKey, player)}
                            onPointerMove={(event) => updateScoreDrag(event, teamKey, player.id)}
                            onPointerUp={stopScoreDrag}
                            type="number"
                            value={player.score}
                          />
                          <div className="cs-elo-score-percent-stack">
                            <button
                              aria-label={`Increase ${player.name} score by 10 percent`}
                              className="cs-elo-score-percent cs-elo-score-percent-positive"
                              onClick={() => changeScoreByPercent(teamKey, player, 1.1)}
                              onMouseDown={(event) => event.preventDefault()}
                              type="button"
                            >
                              +10%
                            </button>
                            <button
                              aria-label={`Decrease ${player.name} score by 10 percent`}
                              className="cs-elo-score-percent cs-elo-score-percent-negative"
                              onClick={() => changeScoreByPercent(teamKey, player, 0.9)}
                              onMouseDown={(event) => event.preventDefault()}
                              type="button"
                            >
                              -10%
                            </button>
                          </div>
                        </div>
                      </td>
                      {teamKey === "left" && (
                        <td className="cs-elo-move-column">
                          <ActionIcon
                            aria-label={`Move ${player.name} to ${state.teams.right.name}`}
                            className="cs-elo-swap-handle"
                            draggable
                            onDragEnd={clearSwapDrag}
                            onDragStart={(event) => startSwapDrag(event, teamKey, player.id)}
                            onClick={() => movePlayer(teamKey, player.id)}
                            variant="light"
                          >
                            <IconArrowRight size={16} />
                          </ActionIcon>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button leftSection={<IconPlus size={16} />} onClick={() => addPlayer(teamKey)} variant="light">
              Add player
            </Button>
          </section>
        ))}
      </div>
    </div>
  );
}
