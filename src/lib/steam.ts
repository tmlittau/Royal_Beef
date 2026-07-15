// Shared, client-safe Steam types. Server logic lives in $lib/server/steam.ts.

export type SteamSearchItem = {
	appId: number;
	name: string;
	thumb: string | null;
};

export type SteamAppDetails = {
	appId: number;
	name: string;
	description: string | null;
	/** Remote Steam header image URL. */
	headerImage: string | null;
	/** Locally cached cover URL (e.g. /covers/steam_285900.jpg), or the remote URL as fallback. */
	coverUrl: string | null;
	genres: string[];
	categories: string[];
	localMultiplayer: boolean;
	/** Suggested modes derived from Steam categories — prefills, but the host can change them. */
	modeHints: string[];
};
