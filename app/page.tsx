"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { downloadPublicPhoto } from "@/lib/image-processing";
import { getApprovedSubmissions } from "@/lib/submissions";

type Photo = {
  id: number | string;
  title: string;
  photographer: string;
  category: string;
  src: string;
  height: "tall" | "wide" | "standard";
  likes: number;
  watermarked?: boolean;
};

const photos: Photo[] = [
  { id: 1, title: "Dolomites, after rain", photographer: "Maya Lin", category: "Nature", src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 2841 },
  { id: 2, title: "Quiet geometry", photographer: "Theo Martin", category: "Architecture", src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=82", height: "standard", likes: 1922 },
  { id: 3, title: "Sunday light", photographer: "June Park", category: "People", src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 3510 },
  { id: 4, title: "Slow coast", photographer: "Ari Costa", category: "Travel", src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82", height: "wide", likes: 2210 },
  { id: 5, title: "Night pulse", photographer: "Nico Vale", category: "Street", src: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=82", height: "standard", likes: 1604 },
  { id: 6, title: "Green room", photographer: "Elsa Moreau", category: "Interiors", src: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 2987 },
  { id: 7, title: "Freshly made", photographer: "Omar Khan", category: "Food", src: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=82", height: "standard", likes: 1320 },
  { id: 8, title: "Salt air", photographer: "Rin Sato", category: "Nature", src: "https://images.unsplash.com/photo-1476673160081-cf065607f449?auto=format&fit=crop&w=1200&q=82", height: "wide", likes: 2664 },
  { id: 9, title: "Soft focus", photographer: "Léa Dubois", category: "Fashion", src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=82", height: "tall", likes: 4120 },
];

const categories = ["All", "Nature", "People", "Architecture", "Travel", "Street", "Fashion", "Food", "Interiors"];

export default function Home() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [liked, setLiked] = useState<Array<number | string>>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [communityPhotos, setCommunityPhotos] = useState<Photo[]>([]);
  const [toast, setToast] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  useEffect(() => {
    getApprovedSubmissions().then((items) => setCommunityPhotos(items.map((item) => ({
      id:item.id, title:item.title, photographer:item.photographerName, category:item.category,
      src:item.downloadUrl, height:"standard", likes:0, watermarked:item.publicVersion,
    })))).catch(() => {});
  }, []);

  const allPhotos = useMemo(() => [...communityPhotos, ...photos], [communityPhotos]);
  const filtered = useMemo(() => allPhotos.filter((photo) =>
    (category === "All" || photo.category === category) &&
    `${photo.title} ${photo.photographer} ${photo.category}`.toLowerCase().includes(query.toLowerCase())
  ), [allPhotos, category, query]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function toggleLike(id: number | string) {
    setLiked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function share(photo: Photo) {
    const data = { title: `${photo.title} — LUMA`, text: `See ${photo.title} by ${photo.photographer} on LUMA`, url: window.location.href };
    if (navigator.share) await navigator.share(data).catch(() => {});
    else await navigator.clipboard.writeText(window.location.href).then(() => notify("Link copied to clipboard"));
  }

  async function download(photo: Photo) {
    setDownloadingId(photo.id);
    try {
      await downloadPublicPhoto({
        url: photo.src,
        title: photo.title,
        alreadyWatermarked: photo.watermarked,
      });
      notify("Compressed copyright download ready");
    } catch {
      notify("Download could not be prepared. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  function addComment(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) return;
    setComments((current) => [comment.trim(), ...current]);
    setComment("");
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Luma by WildSaura home">LU<span>●</span>MA <small>by WildSaura</small></a>
        <nav aria-label="Main navigation">
          <a href="#discover">Discover</a>
          <a href="#collections">Collections</a>
          <a href="#about">About</a>
          <a href="/login">Sign in</a>
          <a href="https://www.wildsaura.com">WildSaura ↗</a>
        </nav>
        <a className="upload-button" href="/submit">Share your work <span>↗</span></a>
      </header>

      <section className="hero" id="discover">
        <p className="eyebrow">Independent photography. Curated daily.</p>
        <h1>Images worth<br /><em>keeping.</em></h1>
        <div className="hero-bottom">
          <p>Discover remarkable images from photographers everywhere. Free to explore, easy to share, ready to download.</p>
          <form className="search" onSubmit={(e) => e.preventDefault()}>
            <span>⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search places, moods, creators…" aria-label="Search photos" />
            <kbd>⌘ K</kbd>
          </form>
        </div>
      </section>

      <section className="gallery-section" id="collections">
        <div className="filter-row">
          <div className="categories" aria-label="Photo categories">
            {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <span className="result-count">{filtered.length.toString().padStart(2, "0")} photographs</span>
        </div>

        <div className="masonry">
          {filtered.map((photo, index) => (
            <article className={`photo-card ${photo.height}`} key={photo.id}>
              <button className="image-button" onClick={() => { setSelected(photo); setComments([]); }} aria-label={`Open ${photo.title}`}>
                <img src={photo.src} alt={`${photo.title}, photograph by ${photo.photographer}`} loading={index < 3 ? "eager" : "lazy"} />
              </button>
              <div className="photo-overlay">
                <div><strong>{photo.title}</strong><span>by {photo.photographer}</span></div>
                <div className="quick-actions">
                  <button onClick={() => toggleLike(photo.id)} className={liked.includes(photo.id) ? "liked" : ""} aria-label="Like photo">{liked.includes(photo.id) ? "♥" : "♡"}</button>
                  <button onClick={() => share(photo)} aria-label="Share photo">↗</button>
                  <button onClick={() => download(photo)} disabled={downloadingId === photo.id} aria-label="Download compressed copyright photo">{downloadingId === photo.id ? "…" : "↓"}</button>
                </div>
              </div>
              <div className="mobile-meta"><span>{photo.title} · {photo.photographer}</span><button onClick={() => toggleLike(photo.id)}>{liked.includes(photo.id) ? "♥" : "♡"} {photo.likes + (liked.includes(photo.id) ? 1 : 0)}</button></div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && <div className="empty">No images found. Try another search.</div>}
      </section>

      <section className="manifesto" id="about">
        <p>Made for looking,<br />not for scrolling.</p>
        <div><span>For photographers</span><h2>Your work deserves space.</h2><p>Join a thoughtful community built around original perspective—not algorithms. Every submission is reviewed privately before publishing.</p><a className="manifesto-link" href="/submit">Share your work ↗</a></div>
      </section>

      <footer>
        <div><a className="brand" href="#">LU<span>●</span>MA <small>by WildSaura</small></a><p className="footer-note">A WildSaura photography project by Madan Shrestha.</p></div>
        <p>Photography for everyone.<br />© 2026 Wilds Aura. All rights reserved.</p>
        <div className="footer-links"><a href="/terms">Terms</a><a href="/license">Photo License</a><a href="/privacy">Privacy</a><a href="/community">Community</a><a href="/copyright">Copyright</a><a href="/data-deletion">Data Deletion</a><a href="https://www.wildsaura.com">WildSaura ↗</a></div>
      </footer>

      {selected && <div className="modal-backdrop" onMouseDown={() => setSelected(null)}>
        <section className="lightbox" onMouseDown={(e) => e.stopPropagation()} aria-modal="true" role="dialog">
          <button className="close" onClick={() => setSelected(null)} aria-label="Close">×</button>
          <div className="lightbox-image"><img src={selected.src} alt={selected.title} /><span>Compressed preview · © WildSaura</span></div>
          <aside>
            <span className="tag">{selected.category}</span>
            <h2>{selected.title}</h2>
            <p>Photograph by <strong>{selected.photographer}</strong></p>
            <div className="detail-actions">
              <button onClick={() => toggleLike(selected.id)}>{liked.includes(selected.id) ? "♥ Liked" : "♡ Like"} · {selected.likes + (liked.includes(selected.id) ? 1 : 0)}</button>
              <button onClick={() => share(selected)}>Share ↗</button>
              <button onClick={() => download(selected)} disabled={downloadingId === selected.id}>{downloadingId === selected.id ? "Preparing download…" : "Download compressed ↓"}</button>
              <a href="/premium">View/download original · Premium soon</a>
            </div>
            <div className="comments">
              <h3>Conversation <span>{comments.length}</span></h3>
              <form onSubmit={addComment}><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a thoughtful comment…" /><button>Post</button></form>
              {comments.map((item, i) => <p key={i}><strong>You</strong>{item}</p>)}
              {!comments.length && <small>Be the first to leave a comment.</small>}
            </div>
          </aside>
        </section>
      </div>}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
