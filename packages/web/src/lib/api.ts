import type {
  BrowseRootResponse,
  CurrentFile,
  FileTreeResponse,
  RootConfigResponse,
  SaveFileResponse,
  SearchResponse,
  UpdateRootResponse
} from "../types";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore parse failures and keep the fallback message
    }

    throw new Error(message);
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

export async function fetchRootConfig(): Promise<RootConfigResponse> {
  return parseJsonResponse<RootConfigResponse>(await fetch("/api/config"));
}

export async function browseRootPath(): Promise<BrowseRootResponse> {
  return parseJsonResponse<BrowseRootResponse>(
    await fetch("/api/config/root/browse", {
      method: "POST"
    })
  );
}

export async function updateRootPath(path: string): Promise<UpdateRootResponse> {
  return parseJsonResponse<UpdateRootResponse>(
    await fetch("/api/config/root", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ path })
    })
  );
}
