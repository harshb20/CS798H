import type { Draft, Language, Submission, WorkflowId } from "./forms";
import type { Session } from "./study";

export type WorkspaceData = {
  lang: Language;
  drafts: Partial<Record<WorkflowId, Draft>>;
  submissions: Submission[];
  sessions: Session[];
};

export const initialData: WorkspaceData = { lang: "en", drafts: {}, submissions: [], sessions: [] };

let connection: Promise<IDBDatabase> | undefined;

function database() {
  connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("formflow", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("workspace");
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
  });
  return connection;
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("workspace", "readonly").objectStore("workspace").get("data");
    request.onsuccess = () => resolve(request.result ?? initialData);
    request.onerror = () => reject(request.error);
  });
}

export type WorkspaceUpdate = (data: WorkspaceData) => WorkspaceData;

export async function saveWorkspace(update: WorkspaceUpdate) {
  const db = await database();
  return new Promise<WorkspaceData>((resolve, reject) => {
    const transaction = db.transaction("workspace", "readwrite");
    const store = transaction.objectStore("workspace");
    const request = store.get("data");
    let next: WorkspaceData;
    request.onsuccess = () => {
      next = update(request.result ?? initialData);
      store.put(next, "data");
    };
    transaction.oncomplete = () => resolve(next);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = name;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
