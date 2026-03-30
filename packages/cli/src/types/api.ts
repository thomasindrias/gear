/**
 * Type definitions for the Gear API
 * These mirror the tRPC router types from @gear/web without requiring a dependency
 */

export interface PublishInput {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
  gearfile_content: string;
  is_public?: boolean;
}

export interface PublishOutput {
  id: string;
  slug: string;
  username: string;
}

export interface DownloadInput {
  username: string;
  slug: string;
}

export interface DownloadOutput {
  gearfile_content: string;
}

export interface ProfileGetInput {
  username: string;
  slug: string;
}

export interface DeleteInput {
  slug: string;
}

export interface DeleteOutput {
  success: boolean;
}
