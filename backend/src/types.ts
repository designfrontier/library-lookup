export interface Book {
  title: string;
  author: string;
  isbn?: string;
  asin?: string;
}

export interface BookAvailability {
  title: string;
  author: string;
  isbn?: string;
  library: string;
  available: boolean;
  format: string;
  branch?: string;
}

export interface LibrarySearchResult {
  title: string;
  author: string;
  available: boolean;
  format: string;
  branch?: string;
}
