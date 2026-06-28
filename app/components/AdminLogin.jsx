"use client";

import { Button, Flex, Input } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useEffect, useState } from "react";

export default function AdminLogin({ apiUrl, isAdmin, setIsAdmin }) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    let ignore = false;

    fetch(apiUrl("/api/admin/session"), {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((session) => {
        if (ignore) return;
        setIsAdmin(session.isAdmin ? "1" : "");
      })
      .catch(() => {
        if (!ignore) setIsAdmin("");
      });

    return () => {
      ignore = true;
    };
  }, [apiUrl, setIsAdmin]);

  const login = async () => {
    const response = await fetch(apiUrl("/api/admin/login"), {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setIsAdmin("");
      showNotification({
        title: "Admin login failed",
        message: error.error ?? "Wrong password.",
        color: "red",
        withBorder: true,
      });
      return;
    }

    setPassword("");
    setIsAdmin("1");
    showNotification({
      title: "Admin enabled",
      message: "Admin controls are unlocked.",
      withBorder: true,
    });
  };

  const logout = async () => {
    await fetch(apiUrl("/api/admin/logout"), {
      method: "POST",
      credentials: "same-origin",
    });
    setPassword("");
    setIsAdmin("");
  };

  if (isAdmin === "1") {
    return (
      <Button onClick={logout} variant="light">
        Logout admin
      </Button>
    );
  }

  return (
    <Flex gap="xs">
      <Input
        aria-label="Admin password"
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") login();
        }}
        placeholder="Admin password"
        type="password"
        value={password}
      />
      <Button onClick={login}>Admin</Button>
    </Flex>
  );
}
