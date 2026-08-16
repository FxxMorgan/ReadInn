const DATABASE_NAME = 'readinn-offline';
const STORE_NAME = 'library';
const DATABASE_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir la biblioteca offline.'));
  });
}

export async function putOfflineItem(key: string, value: unknown): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('No se pudo guardar el contenido offline.'));
  });
  database.close();
}

export async function getOfflineItem<T>(key: string): Promise<T | null> {
  const database = await openDatabase();
  const value = await new Promise<T | null>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('No se pudo leer el contenido offline.'));
  });
  database.close();
  return value;
}

export async function hasOfflineItem(key: string): Promise<boolean> {
  return (await getOfflineItem(key)) !== null;
}
