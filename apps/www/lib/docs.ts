import { join } from "path";
import matter from "gray-matter";

export interface DocMetadata {
  title: string;
  description?: string;
  order?: number;
  category?: string;
  published?: boolean;
  date?: string;
  author?: string;
}

export interface Doc {
  slug: string;
  metadata: DocMetadata;
  content: string;
}

// Guard for browser environment - this module only works on the server
const isBrowser = typeof window !== "undefined";

// Use import.meta.dir which is Bun-specific and works in ESM
const BASE_DIR = isBrowser ? "" : (import.meta.dir?.replace(/\/lib$/, "") ?? "");
const DOCS_PATH = isBrowser ? "" : join(BASE_DIR, "content", "docs");
const BLOG_PATH = isBrowser ? "" : join(BASE_DIR, "content", "blog");

async function readMarkdownFile(filepath: string): Promise<Doc | null> {
  try {
    const file = Bun.file(filepath);
    const content = await file.text();
    const { data, content: markdown } = matter(content);
    
    const slug = filepath
      .split("/")
      .pop()
      ?.replace(/\.mdx?$/, "") || "";

    return {
      slug,
      metadata: data as DocMetadata,
      content: markdown,
    };
  } catch (error) {
    console.error(`Error reading markdown file ${filepath}:`, error);
    return null;
  }
}

export async function getDoc(slug: string): Promise<Doc | null> {
  const filepath = join(DOCS_PATH, `${slug}.md`);
  return readMarkdownFile(filepath);
}

export async function getAllDocs(): Promise<Doc[]> {
  try {
    const glob = new Bun.Glob("**/*.md");
    const files = await Array.fromAsync(glob.scan({ cwd: DOCS_PATH }));
    
    const docs = await Promise.all(
      files.map(file => readMarkdownFile(join(DOCS_PATH, file)))
    );
    
    return docs
      .filter((doc): doc is Doc => doc !== null)
      .sort((a, b) => (a.metadata.order || 999) - (b.metadata.order || 999));
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<Doc | null> {
  const filepath = join(BLOG_PATH, `${slug}.md`);
  return readMarkdownFile(filepath);
}

export async function getAllBlogPosts(): Promise<Doc[]> {
  try {
    const glob = new Bun.Glob("**/*.md");
    const files = await Array.fromAsync(glob.scan({ cwd: BLOG_PATH }));
    
    const posts = await Promise.all(
      files.map(file => readMarkdownFile(join(BLOG_PATH, file)))
    );
    
    return posts
      .filter((post): post is Doc => post !== null && post.metadata.published !== false)
      .sort((a, b) => {
        const dateA = a.metadata.date ? new Date(a.metadata.date).getTime() : 0;
        const dateB = b.metadata.date ? new Date(b.metadata.date).getTime() : 0;
        return dateB - dateA;
      });
  } catch {
    return [];
  }
}

