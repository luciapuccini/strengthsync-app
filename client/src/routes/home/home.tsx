import type { JSX } from "react";

// TBD How to handle this
// const clientId = useAppStore((s) => s.selectedClientId);
// const clients = use(clientsResource());
// const targetClientId = clientId ?? clients[0]?.id ?? null;
export function Home(): JSX.Element {
  return <div>Home splash page</div>;
}
