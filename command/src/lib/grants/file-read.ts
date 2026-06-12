import { grantMarkdownPath } from "./paths";
import { readGrantFile } from "./markdown";
import { extractSections, type MarkdownSection } from "./markdown";
import type { GrantFrontmatter } from "./types";

/*
  Server-only helper for the detail view to read a grant's markdown file
  directly. Markdown is canonical; the page renders from the file, then
  enriches with operational data from Supabase.
*/

export type GrantFile = {
  frontmatter: GrantFrontmatter;
  body: string;
  sections: MarkdownSection[];
  checksum: string;
  exists: boolean;
};

export function readGrantFromDisk(slug: string): GrantFile {
  try {
    const { frontmatter, body, checksum } = readGrantFile(
      grantMarkdownPath(slug),
    );
    return {
      frontmatter,
      body,
      sections: extractSections(body),
      checksum,
      exists: true,
    };
  } catch {
    return {
      frontmatter: {},
      body: "",
      sections: [],
      checksum: "",
      exists: false,
    };
  }
}
