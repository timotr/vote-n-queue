"use client";

import { Group, Stack, Switch, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import useSWR from "swr";
import AdminLogin from "./AdminLogin";
import { fetcher } from "./fetcher";

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

export default function Settings() {
  const [isAdmin, setIsAdmin] = useLocalStorage({
    key: "admin",
    defaultValue: "",
  });
  const { data: settings, mutate } = useSWR(apiUrl("/api/settings"), fetcher, {
    refreshInterval: 5000,
  });
  const allowSameGameRankedVotes = settings?.allowSameGameRankedVotes === true;

  const updateRankedVoteSetting = async (event) => {
    const nextValue = event.currentTarget.checked;
    const response = await fetch(apiUrl("/api/settings"), {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ allowSameGameRankedVotes: nextValue }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 401) setIsAdmin("");
      showNotification({
        title: "Setting was not saved",
        message: error.error ?? "Please log in as admin and try again.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    const nextSettings = await response.json();
    await mutate(nextSettings, { revalidate: false });
    showNotification({
      title: "Setting saved",
      message: nextSettings.allowSameGameRankedVotes
        ? "Players can put multiple trophies on the same game."
        : "Players can only place one trophy per game.",
      withBorder: true,
    });
  };

  return (
    <Stack className="settings-panel" gap="lg">
      <Group justify="space-between">
        <div>
          <Text fw={700}>Admin settings</Text>
          <Text c="dimmed" size="sm">
            Configure shared voting behavior for everyone.
          </Text>
        </div>
        <AdminLogin apiUrl={apiUrl} isAdmin={isAdmin} setIsAdmin={setIsAdmin} />
      </Group>

      <Switch
        checked={allowSameGameRankedVotes}
        description="When disabled, choosing another trophy for the same game moves your rank to the newest trophy."
        disabled={isAdmin !== "1" || !settings}
        label="Allow multiple trophies on the same game"
        onChange={updateRankedVoteSetting}
      />
    </Stack>
  );
}
