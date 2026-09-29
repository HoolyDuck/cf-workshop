type HostEntryPageProps = {
	onHost: () => void;
	creating: boolean;
	error: string | null;
};

function HostEntryPage({ onHost, creating, error }: HostEntryPageProps) {
	return (
		<div className="container">
			<header>
				<div className="eyebrow">Cloudflare Workshop</div>
				<h1>Host a Quiz</h1>
				<p>This page is for the presenter only — players join with a room code at the main page.</p>
			</header>

			<button className="primary" onClick={onHost} disabled={creating}>
				{creating ? "Creating room..." : "Create Room"}
			</button>

			{error && <p className="error">{error}</p>}
		</div>
	);
}

export default HostEntryPage;
