import type { FormatPlan, MatchSlot } from './types';

export type DisplayMatch = {
	round: number;
	group?: number;
	label: string;
	kind: string;
	parts: string[];
};

const teamLetter = (t: number) => String.fromCharCode(65 + t);

/** Resolve a plan's symbolic slots into human-readable participant strings. */
export function resolvePlan(plan: FormatPlan, names: Map<number, string>): DisplayMatch[] {
	const refLabel = new Map(plan.matches.map((m) => [m.ref, m.label]));
	const slotText = (s: MatchSlot): string => {
		switch (s.kind) {
			case 'competitor': {
				const name = names.get(s.competitorId) ?? `#${s.competitorId}`;
				return s.team === undefined ? name : `${name} (${teamLetter(s.team)})`;
			}
			case 'winner':
				return `Winner · ${refLabel.get(s.ref) ?? s.ref}`;
			case 'loser':
				return `Loser · ${refLabel.get(s.ref) ?? s.ref}`;
			case 'heatPlace':
				return `${refLabel.get(s.ref) ?? s.ref} #${s.place}`;
			case 'bye':
				return 'bye';
		}
	};
	return plan.matches.map((m) => ({
		round: m.round,
		group: m.group,
		label: m.label,
		kind: m.kind,
		parts: m.slots.map(slotText)
	}));
}
