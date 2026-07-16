// Shared, client-safe competition types.

export type CompetitionFormInitial = {
	name?: string;
	timeBudgetMinutes?: number;
	gamesPerPlayer?: number;
	competitorNames?: string[];
};
