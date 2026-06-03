/*
  Shared types for universal search. Lives outside queries.ts so the
  client palette can import without dragging the "use server" module
  into the client bundle.
*/

export type SearchResult =
  | {
      type: "grant";
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      href: string;
    }
  | {
      type: "funder";
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      href: string;
    }
  | {
      type: "boilerplate";
      id: string;
      slug: string;
      title: string;
      subtitle: string | null;
      href: string;
    }
  | {
      type: "inbox";
      id: string;
      title: string;
      subtitle: string | null;
      href: string;
    };

export type SearchResultType = SearchResult["type"];

export type UniversalSearchResults = {
  grants: SearchResult[];
  funders: SearchResult[];
  boilerplate: SearchResult[];
  inbox: SearchResult[];
};
