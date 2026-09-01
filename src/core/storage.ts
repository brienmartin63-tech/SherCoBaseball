import type { GameState } from "./types";

const DATABASE = "sherco-grand-slam";
const STORE = "game-state";
const CURRENT_GAME = "current";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveGame(game: GameState): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(game, CURRENT_GAME);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function loadGame(): Promise<GameState | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const database = await openDatabase();
  const game = await new Promise<GameState | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).get(CURRENT_GAME);
    request.onsuccess = () => resolve(request.result as GameState | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return game;
}
