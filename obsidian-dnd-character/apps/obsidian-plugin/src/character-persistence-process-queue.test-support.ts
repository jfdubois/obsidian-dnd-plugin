import { vi } from 'vitest';
import type { EventRef, TFile, Vault } from 'obsidian';

export interface ProcessCall {
	filePath: string;
	state: 'queued' | 'blocked' | 'running' | 'committed' | 'failed';
	callbackContent: string | null;
	writtenContent: string | null;
}

export interface ProcessGate {
	entered: Promise<void>;
	release: () => void;
}

interface InternalProcessGate extends ProcessGate {
	signalEntry: () => void;
	waitForRelease: Promise<void>;
}

export interface QueuedMockVault extends Vault {
	fileStore: Record<string, string>;
	processCalls: ProcessCall[];
	holdNextProcessOperation: () => ProcessGate;
}

function createProcessGate(): InternalProcessGate {
	let signalEntry!: () => void;
	let release!: () => void;
	return {
		entered: new Promise<void>((resolve) => { signalEntry = resolve; }),
		release: () => release(),
		signalEntry: () => signalEntry(),
		waitForRelease: new Promise<void>((resolve) => { release = resolve; }),
	};
}

export function createQueuedMockVault(initialStore: Record<string, string> = {}): QueuedMockVault {
	const queuedGates: InternalProcessGate[] = [];
	const queues = new Map<string, Promise<void>>();
	const vault = {
		fileStore: { ...initialStore },
		processCalls: [] as ProcessCall[],
		holdNextProcessOperation: () => {
			const gate = createProcessGate();
			queuedGates.push(gate);
			return gate;
		},
		getFileByPath: vi.fn((path: string) => (
			path in vault.fileStore ? { path, name: path.split('/').pop()?.replace('.json', '') ?? '' } as TFile : null
		)),
		getFolderByPath: vi.fn(() => null),
		create: vi.fn(),
		createFolder: vi.fn(),
		cachedRead: vi.fn(),
		process: vi.fn((file: TFile, callback: (content: string) => string) => {
			const call: ProcessCall = { filePath: file.path, state: 'queued', callbackContent: null, writtenContent: null };
			vault.processCalls.push(call);
			const gate = queuedGates.shift();
			const run = async (): Promise<string> => {
				if (gate !== undefined) {
					call.state = 'blocked';
					gate.signalEntry();
					await gate.waitForRelease;
				}
				call.state = 'running';
				const currentContent = vault.fileStore[file.path] ?? '';
				call.callbackContent = currentContent;
				try {
					const writtenContent = callback(currentContent);
					vault.fileStore[file.path] = writtenContent;
					call.writtenContent = writtenContent;
					call.state = 'committed';
					return writtenContent;
				} catch (error) {
					call.state = 'failed';
					throw error;
				}
			};
			const prior = queues.get(file.path) ?? Promise.resolve();
			const operation = prior.then(run, run);
			queues.set(file.path, operation.then(() => undefined, () => undefined));
			return operation;
		}),
		delete: vi.fn(),
		on: vi.fn().mockReturnValue({} as EventRef),
	};
	return vault as unknown as QueuedMockVault;
}
