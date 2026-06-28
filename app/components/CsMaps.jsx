"use client";

import { Button, Flex, Group, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import AdminLogin from "./AdminLogin";
import { CS2_MAPS } from "./cs2Maps";
import { fetcher } from "./fetcher";
import WeightedWheel from "./WeightedWheel";

const WHEEL_ITEM_LIMIT = 6;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

function getMapVoteCount(results, mapId) {
  return results?.votes?.find((vote) => vote.mapId === mapId)?.votes ?? 0;
}

function getMapTypeLabel(type) {
  return type === "bomb" ? "Bomb maps" : "Hostage maps";
}

export default function CsMaps() {
  const [isAdmin, setIsAdmin] = useLocalStorage({
    key: "admin",
    defaultValue: "",
  });
  const [failedImages, setFailedImages] = useState({});
  const { data: results, mutate } = useSWR(apiUrl("/api/cs2-maps/results"), fetcher, {
    refreshInterval: 1000,
  });

  const mapGroups = useMemo(
    () => [
      { type: "bomb", maps: CS2_MAPS.filter((map) => map.type === "bomb") },
      { type: "hostage", maps: CS2_MAPS.filter((map) => map.type === "hostage") },
    ],
    []
  );
  const wheelItems = useMemo(
    () => (results?.votes ?? []).slice(0, WHEEL_ITEM_LIMIT),
    [results?.votes]
  );

  const voteForMap = async (mapId) => {
    if (results?.myVote === mapId) return;

    const response = await fetch(apiUrl("/api/cs2-maps/vote"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mapId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showNotification({
        title: "Map vote was not updated",
        message: error.error ?? "Please try again.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const nextResults = await response.json();
    await mutate((currentResults) => ({ ...currentResults, ...nextResults }), {
      revalidate: true,
    });
  };

  const clearMapVotes = async () => {
    const response = await fetch(apiUrl("/api/cs2-maps/vote"), {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (response.status === 401) {
      setIsAdmin("");
      return;
    }
    await mutate();
  };

  const spinMapWheel = async () => {
    const response = await fetch(apiUrl("/api/cs2-maps/vote"), {
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

  return (
    <Flex className="cs-map-layout">
      <div className="cs-map-pool">
        <Group justify="space-between" className="cs-map-toolbar">
          <div>
            <Text fw={700}>CS2 map voting</Text>
            <Text c="dimmed" size="sm">
              Pick one map. Choosing another switches your vote.
            </Text>
          </div>
          <Group gap="xs">
            <AdminLogin apiUrl={apiUrl} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
            {isAdmin === "1" && (
              <Button color="red" leftSection={<IconTrash size={16} />} onClick={clearMapVotes} variant="light">
                Clear map votes
              </Button>
            )}
          </Group>
        </Group>

        {mapGroups.map((group) => (
          <section className="cs-map-section" key={group.type}>
            <Text className="cs-map-section-title" fw={700}>
              {getMapTypeLabel(group.type)}
            </Text>
            <div className="cs-map-grid">
              {group.maps.map((map) => {
                const selected = results?.myVote === map.id;
                const voteCount = getMapVoteCount(results, map.id);

                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? "cs-map-card cs-map-card-selected" : "cs-map-card"}
                    key={map.id}
                    onClick={() => voteForMap(map.id)}
                    type="button"
                  >
                    <div className="cs-map-image-wrap">
                      {failedImages[map.id] ? (
                        <div className="cs-map-image-fallback">{map.name}</div>
                      ) : (
                        <img
                          alt=""
                          className="cs-map-image"
                          onError={() => setFailedImages((current) => ({ ...current, [map.id]: true }))}
                          src={map.image}
                        />
                      )}
                    </div>
                    <span className="cs-map-card-meta">
                      <span className="cs-map-card-name">{map.name}</span>
                      <span className="cs-map-card-votes">{voteCount}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Flex className="cs-map-results" direction="column">
        <div className="cs-map-next">
          <Text c="dimmed" size="sm">
            Next map
          </Text>
          <Text fw={800} size="xl">
            {results?.nextMap || "Spin the wheel"}
          </Text>
        </div>
        <WeightedWheel
          ariaLabel="Weighted CS2 map wheel"
          isAdmin={isAdmin === "1"}
          items={wheelItems}
          onSpin={spinMapWheel}
          spinAngle={results?.spinAngle}
        />
        <div className="cs-map-top-votes">
          <Text fw={700}>Top maps</Text>
          {(results?.votes ?? []).map((vote, index) => (
            <div className="cs-map-top-row" key={vote.mapId}>
              <span>{index + 1}. {vote.name}</span>
              <strong>{vote.votes}</strong>
            </div>
          ))}
        </div>
      </Flex>
    </Flex>
  );
}
