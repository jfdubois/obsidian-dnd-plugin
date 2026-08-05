/** PER-005: deterministic overlapping Vault.process operations. */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'obsidian';
import type { Character } from '@obsidian-dnd/character-contract';
import type { CharacterId } from '@obsidian-dnd/domain';

vi.mock('obsidian', () => ({ App: class {}, Vault: class {}, TFile: class {}, TFolder: class {}, EventRef: class {} }));
vi.mock('@obsidian-dnd/character-contract', () => ({
	serializeCharacter: vi.fn(),
	deserializeCharacter: vi.fn(),
	CharacterSerializationError: class extends Error { public readonly reason: string = ''; public readonly cause: unknown = undefined; },
}));
vi.mock('@obsidian-dnd/domain', () => ({ characterIdStr: vi.fn((id: string) => id) }));

import * as characterContract from '@obsidian-dnd/character-contract';
import { updateCharacterInVault } from './character-update';
import { createQueuedMockVault } from './character-persistence-process-queue.test-support';

const charactersPath = 'dnd-characters';
const filePath = 'dnd-characters/char-1.json';

function makeTestCharacter(): Character {
	return {
		id: 'char-1' as CharacterId,
		schemaVersion: 1,
		identity: { name: 'Original' },
		catalog: { catalogSchemaVersion: 1, createdWithRevision: 'rev-001', lastValidatedRevision: 'rev-001' },
		contentPolicy: { ruleset: '2024', enabledSourceIds: [], mode: 'snapshot' },
		progression: { classes: [] }, origins: { speciesId: 'species:2024:xphb:human', backgroundId: 'bg:2024:xphb:soldier' }, selections: {},
		abilities: { scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } }, spells: { selections: [], spellSlotsUsed: {} }, inventory: [],
		resources: { currentHp: 10, temporaryHp: 0, deathSaves: { successes: 0, failures: 0 }, hitDiceUsed: {}, featureUses: {}, conditions: [] },
		overrides: {}, metadata: { createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' },
	} as unknown as Character;
}

describe('PER-005: overlapping character mutation via Vault.process', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(characterContract.serializeCharacter).mockImplementation((character) => JSON.stringify(character));
		vi.mocked(characterContract.deserializeCharacter).mockImplementation((json) => JSON.parse(json) as Character);
	});

	it('T2: queued overlapping mutations preserve both independent changes', async () => {
		const character = makeTestCharacter();
		const vault = createQueuedMockVault({ [filePath]: JSON.stringify(character) });
		const app = { vault } as unknown as App;
		const firstGate = vault.holdNextProcessOperation();
		const resultA = updateCharacterInVault(app, character.id, (current) => (
			{ ...current, identity: { ...current.identity, name: 'Mutated A' } } as Character
		), charactersPath);
		await firstGate.entered;
		const observedByB: Character[] = [];
		const resultB = updateCharacterInVault(app, character.id, (current) => {
			observedByB.push(current);
			return { ...current, resources: { ...current.resources, currentHp: 7 } } as Character;
		}, charactersPath);

		expect(vault.processCalls).toHaveLength(2);
		expect(vault.processCalls[0]?.state).toBe('blocked');
		expect(vault.processCalls[1]?.state).toBe('queued');
		firstGate.release();
		const [a, b] = await Promise.all([resultA, resultB]);

		expect(a).toMatchObject({ status: 'updated', character: { identity: { name: 'Mutated A' }, resources: { currentHp: 10 } } });
		expect(b).toMatchObject({ status: 'updated', character: { identity: { name: 'Mutated A' }, resources: { currentHp: 7 } } });
		expect(observedByB[0]).toMatchObject({ identity: { name: 'Mutated A' }, resources: { currentHp: 10 } });
		expect(vault.processCalls[1]?.callbackContent).toContain('"Mutated A"');
		expect(JSON.parse(vault.fileStore[filePath]!)).toMatchObject({ identity: { name: 'Mutated A' }, resources: { currentHp: 7 } });
	});

	it('T3: a failed queued second mutation preserves A and does not stop later mutation C', async () => {
		const character = makeTestCharacter();
		const vault = createQueuedMockVault({ [filePath]: JSON.stringify(character) });
		const app = { vault } as unknown as App;
		const firstGate = vault.holdNextProcessOperation();
		const resultA = updateCharacterInVault(app, character.id, (current) => (
			{ ...current, identity: { ...current.identity, name: 'Mutated A' } } as Character
		), charactersPath);
		await firstGate.entered;
		const resultB = updateCharacterInVault(app, character.id, () => { throw new Error('B fails in queued operation'); }, charactersPath);
		expect(vault.processCalls).toHaveLength(2);
		firstGate.release();
		const [a, b] = await Promise.all([resultA, resultB]);

		expect(a).toMatchObject({ status: 'updated', character: { identity: { name: 'Mutated A' } } });
		expect(b).toMatchObject({ status: 'error', reason: 'mutation-failed' });
		expect(JSON.parse(vault.fileStore[filePath]!)).toMatchObject({ identity: { name: 'Mutated A' }, resources: { currentHp: 10 } });
		expect(vault.processCalls[1]).toMatchObject({ state: 'failed', writtenContent: null });

		const observedByC: Character[] = [];
		const resultC = await updateCharacterInVault(app, character.id, (current) => {
			observedByC.push(current);
			return { ...current, resources: { ...current.resources, currentHp: 7 } } as Character;
		}, charactersPath);
		expect(resultC).toMatchObject({ status: 'updated', character: { identity: { name: 'Mutated A' }, resources: { currentHp: 7 } } });
		expect(observedByC[0]).toMatchObject({ identity: { name: 'Mutated A' }, resources: { currentHp: 10 } });
		expect(JSON.parse(vault.fileStore[filePath]!)).toMatchObject({ identity: { name: 'Mutated A' }, resources: { currentHp: 7 } });
	});
});
