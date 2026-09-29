export type QuizOption = {
	id: number;
	position: number;
	text: string;
};

export type QuizQuestion = {
	id: number;
	position: number;
	text: string;
	// Index into `options`, by position. Never sent to clients before reveal.
	correctOption: number;
	options: QuizOption[];
};

export type Quiz = {
	id: number;
	title: string;
	questions: QuizQuestion[];
};
