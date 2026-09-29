import { useState } from "react";

import { createRoom } from "./api/rooms";
import HomePage from "./pages/HomePage";
import HostEntryPage from "./pages/HostEntryPage";
import HostPage from "./pages/HostPage";
import PlayerPage from "./pages/PlayerPage";
import JoinForm from "./components/JoinForm";

// The presenter navigates to /host directly — it's never linked from the
// public landing page, so players can't stumble into room controls.
const isHostRoute = window.location.pathname === "/host";

type View =
	| { kind: "home" }
	| { kind: "host-entry" }
	| { kind: "join" }
	| { kind: "host"; code: string }
	| { kind: "player"; code: string; playerName: string };

function App() {
	const [view, setView] = useState<View>(isHostRoute ? { kind: "host-entry" } : { kind: "home" });
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleHost() {
		setCreating(true);
		setError(null);

		try {
			const code = await createRoom();
			setView({ kind: "host", code });
		} catch {
			setError("Couldn't create a room. Try again.");
		} finally {
			setCreating(false);
		}
	}

	switch (view.kind) {
		case "home":
			return <HomePage onJoin={() => setView({ kind: "join" })} />;
		case "host-entry":
			return <HostEntryPage onHost={handleHost} creating={creating} error={error} />;
		case "join":
			return (
				<JoinForm
					onJoin={(code, playerName) => setView({ kind: "player", code, playerName })}
					onBack={() => setView({ kind: "home" })}
				/>
			);
		case "host":
			return <HostPage code={view.code} />;
		case "player":
			return <PlayerPage code={view.code} playerName={view.playerName} />;
	}
}

export default App;
