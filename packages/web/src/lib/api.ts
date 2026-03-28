import type {
  CurrentFile,
  FileTreeResponse,
  SaveFileResponse,
  SearchResponse
} from "../types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchFileTree(): Promise<FileTreeResponse> {
  return parseJsonResponse<FileTreeResponse>(await fetch("/api/files"));
}

export async function fetchFile(path: string): Promise<CurrentFile> {
  return parseJsonResponse<CurrentFile>(
    await fetch(`/api/files/${encodeURIComponent(path)}`)
  );
}

export async function searchFiles(query: string): Promise<SearchResponse> {
  return parseJsonResponse<SearchResponse>(
    await fetch(`/api/search?q=${encodeURIComponent(query)}`)
  );
}

export async function saveFile(
  path: string,
  content: string
): Promise<SaveFileResponse> {
  return parseJsonResponse<SaveFileResponse>(
    await fetch(`/api/files/${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    })
  );
}
