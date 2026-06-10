import { useState } from "react";
import { ArrowUpRight, BookOpen, Calendar, ExternalLink, Shuffle } from "lucide-react";

import { blogPosts, socials, type BlogPost } from "../data";
import { SectionHeader } from "./About";

const PICK = 3;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

function pickRandom(arr: BlogPost[], n: number): BlogPost[] {
  return shuffle(arr).slice(0, n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>(() => pickRandom(blogPosts, PICK));
  const hashnode = socials.find((s) => s.label === "Hashnode");

  const reshuffle = () => setPosts(pickRandom(blogPosts, PICK));

  return (
    <section id="blog" className="pf-section">
      <SectionHeader
        levelId="06"
        title="Blog & Articles"
        subtitle="logs/recent-articles"
      >
        Retours d'expérience et bonnes pratiques DevOps, Cloud et Kubernetes — publiés sur
        Hashnode (sur mes labs <code className="pf-inline-code">cloud-lab</code>,{" "}
        <code className="pf-inline-code">container-lab</code>,{" "}
        <code className="pf-inline-code">pipeline-lab</code>,{" "}
        <code className="pf-inline-code">docker-lab</code>).
      </SectionHeader>

      {blogPosts.length === 0 ? (
        <div className="pf-blog-error" role="status">
          <BookOpen size={18} aria-hidden="true" />
          <span>Aucun article pour l'instant.</span>
        </div>
      ) : (
        <>
          <div className="pf-blog-grid">
            {posts.map((post) => (
              <a
                key={post.url}
                className="pf-blog-card"
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {post.coverImage && (
                  <div className="pf-blog-cover">
                    <img
                      src={post.coverImage}
                      alt={`Couverture de l'article « ${post.title} »`}
                      loading="lazy"
                    />
                  </div>
                )}
                <header className="pf-blog-meta">
                  <span className="pf-blog-date">
                    <Calendar size={11} aria-hidden="true" /> {formatDate(post.publishedAt)}
                  </span>
                  {post.readMinutes != null && (
                    <span className="pf-blog-read">{post.readMinutes} min</span>
                  )}
                </header>
                <h3 className="pf-blog-title">{post.title}</h3>
                <p className="pf-blog-brief">{post.brief}</p>
                <span className="pf-blog-cta">
                  Lire l'article
                  <ArrowUpRight size={14} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>

          <div className="pf-blog-foot">
  
            {hashnode && (
              <a
                className="pf-btn pf-btn-primary"
                href={hashnode.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir tous les articles
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </>
      )}
    </section>
  );
}
