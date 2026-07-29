/**
 * Port of the PHP `DomainException` usage: a rule violation the player caused
 * (not enough gold, locked stage, full inventory). The UI surfaces `message`
 * verbatim in the alert modal, exactly like the old 422 JSON responses did.
 */
export class GameError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GameError';
    }
}

export function isGameError(error: unknown): error is GameError {
    return error instanceof GameError;
}

export function errorMessage(error: unknown): string {
    return isGameError(error) ? error.message : 'Akcja nie powiodła się.';
}
