/**
 * Port of `app/Game/Services/PlayerRankingService.php` +
 * `PlayerRankingRepository`.
 *
 * The SQL version ranked every player in the database. With the Zustand
 * backend the only profiles that exist are the characters created in this
 * browser, so the leaderboard is local until Supabase is wired up.
 */

import type { GameProfile, PlayerRanking, RankingEntry } from './types';

/** Highest level first, then most experience, then oldest profile. */
function compareProfiles(left: GameProfile, right: GameProfile): number {
    if (left.level !== right.level) {
        return right.level - left.level;
    }

    if (left.exp !== right.exp) {
        return right.exp - left.exp;
    }

    return left.id.localeCompare(right.id);
}

export function levelRanking(
    profiles: GameProfile[],
    currentProfileId: string,
    limit = 20,
): PlayerRanking {
    const ordered = [...profiles].sort(compareProfiles);

    const entries: RankingEntry[] = ordered.slice(0, limit).map((profile, index) => ({
        position: index + 1,
        profileId: profile.id,
        nick: profile.nick,
        level: profile.level,
        currentUser: profile.id === currentProfileId,
    }));

    const currentIndex = ordered.findIndex((profile) => profile.id === currentProfileId);

    return {
        entries,
        currentPosition: currentIndex >= 0 ? currentIndex + 1 : ordered.length + 1,
        activeSort: 'level',
    };
}
