import type { Player } from "../types/quiz";

type PlayerListProps = {
	players: Player[];
};

function PlayerList({ players }: PlayerListProps) {
	if (players.length === 0) {
		return <p>Waiting for players to join...</p>;
	}

	return (
		<div>
			<div className="options">
				{players.map((player) => (
					<div key={player.id} className="option">
						<span>{player.name}</span>
						<span>{player.connected ? "connected" : "disconnected"}</span>
					</div>
				))}
			</div>
			<p>
				{players.length} {players.length === 1 ? "player" : "players"} connected
			</p>
		</div>
	);
}

export default PlayerList;
