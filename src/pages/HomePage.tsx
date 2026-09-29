type HomePageProps = {
	onJoin: () => void;
};

function HomePage({ onJoin }: HomePageProps) {
	return (
		<div className="container">
			<header>
				<div className="eyebrow">Cloudflare Workshop</div>
				<h1>Cloudflare Quiz</h1>
				<p>A real-time, multiplayer quiz built on Workers, D1, and Durable Objects.</p>
			</header>

			<button className="primary" onClick={onJoin}>
				Join Quiz
			</button>
		</div>
	);
}

export default HomePage;
