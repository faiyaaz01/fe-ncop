import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_shell/user-management")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_shell/user-management"!</div>;
}
