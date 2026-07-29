/**
 * Port of `app/Game/Services/AchievementService.php`.
 */

import { ACHIEVEMENTS, type AchievementMeta, type AchievementMetric } from './enums';
import type { AchievementEntry, GameProfile, PlayerAchievements } from './types';

function metricValue(metric: AchievementMetric, profile: GameProfile): number {
    switch (metric) {
        case 'level':
            return profile.level;
        case 'played_seconds':
            return profile.playedSeconds;
        case 'vitality_assigned':
            return profile.vitalityPointsAssigned;
        case 'strength_assigned':
            return profile.strengthPointsAssigned;
        case 'luck_assigned':
            return profile.luckPointsAssigned;
        case 'damage':
            return profile.dmgMax;
        case 'armor':
            return profile.armor;
        case 'stun':
            return Math.floor(profile.stun);
        case 'monsters_killed':
            return profile.monstersKilled;
        case 'unique_items_found':
            return profile.uniqueItemsFound;
        case 'heroic_items_found':
            return profile.heroicItemsFound;
        case 'legendary_items_found':
            return profile.legendaryItemsFound;
    }
}

function formatValue(value: number, unit: string): string {
    if (unit === 's') {
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);

        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    return unit === '' ? String(value) : `${value}${unit}`;
}

function progressFor(achievement: AchievementMeta, profile: GameProfile): AchievementEntry {
    const value = metricValue(achievement.metric, profile);
    const target = Math.max(1, achievement.target);
    const percent = Math.min(100, Math.floor((value / target) * 100));
    const completed = value >= target;

    return {
        id: achievement.id,
        label: achievement.label,
        icon: achievement.icon,
        value,
        target,
        percent,
        progressLabel: completed
            ? 'Osiągnięcie ukończone'
            : `Następne osiągnięcie przy ${formatValue(target, achievement.unit)} (${percent}%)`,
        completed,
    };
}

export function achievementsFor(profile: GameProfile): PlayerAchievements {
    const entries = ACHIEVEMENTS.map((achievement) => progressFor(achievement, profile));
    const completedCount = entries.filter((entry) => entry.completed).length;
    const averagePercent =
        entries.length === 0
            ? 0
            : entries.reduce((total, entry) => total + entry.percent, 0) / entries.length;

    return {
        entries,
        completedCount,
        totalCount: entries.length,
        overallPercent: Math.floor(averagePercent),
    };
}
