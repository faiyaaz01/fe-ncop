import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RedirectToLogin,
});

function RedirectToLogin() {
  return <Navigate to="/index/login" />;
}
