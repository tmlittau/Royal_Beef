// Shared, client-safe competition types.

export type CompetitionFormInitial = {
	name?: string;
	timeBudgetMinutes?: number;
	competitorNames?: string[];
	gameIds?: number[];
};
