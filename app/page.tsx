"use client";

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { photoPath, type Photo } from "@/lib/gallery-data";
import { downloadPublicPhoto } from "@/lib/image-processing";
import {
  addPhotoComment, getPhotoComments, getPhotoStats, recordSavedShare,
  toggleSavedLike, type PhotoComment, type PhotoStats,
} from "@/lib/interactions";

const categories = ["All", "Nature", "People", "Architecture", "Travel", "Street", "Fashion", "Food", "Interiors"];
const emptyStats: PhotoStats = { likesCount: 0, sharesCount: 0, likedByCurrentUser: false };
const subscribeToDay = () => () => {};
const getCurrentDay = () => Math.floor(Date.now() / 86_400_000);
const getServerDay = () => 0;

export default function Home() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [communityPhotos, setCommunityPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<Record<string, PhotoStats>>({});
  const [toast, setToast] = useState("");
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [commentBusy, setCommentBusy] = useState(false);
  const [interactionBusy, setInteractionBusy] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);
  const dayNumber = useSyncExternalStore(subscribeToDay, getCurrentDay, getServerDay);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    fetch("/api/gallery")
      .then((response) => response.ok ? response.json() as Promise<Photo[]> : [])
      .then(setCommunityPhotos)
      .catch(() => {});
  }, []);

  const allPhotos = useMemo(() => [...communityPhotos].sort((a, b) => {
    const newest = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    const oldest = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    return newest - oldest;
  }), [communityPhotos]);

  useEffect(() => {
    const photoId = new URLSearchParams(window.location.search).get("photo");
    if (!photoId) return;
    const sharedPhoto = allPhotos.find((photo) => String(photo.id) === photoId);
    if (sharedPhoto) window.location.replace(photoPath(sharedPhoto));
  }, [allPhotos]);

  useEffect(() => {
    let active = true;
    getPhotoStats(allPhotos.map((photo) => photo.id), user?.uid)
      .then((nextStats) => { if (active) setStats(nextStats); })
      .catch(() => {});
    return () => { active = false; };
  }, [allPhotos, user?.uid]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    getPhotoComments(selected.id)
      .then((items) => { if (active) setComments(items); })
      .catch(() => {});
    return () => { active = false; };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected]);

  const filtered = useMemo(() => allPhotos.filter((photo) =>
    (category === "All" || photo.category === category) &&
    `${photo.title} ${photo.photographer} ${photo.category}`.toLowerCase().includes(query.toLowerCase())
  ), [allPhotos, category, query]);

  const dailyHero = useMemo(() => {
    const ranked = [...allPhotos].sort((a, b) =>
      (b.likes + (stats[String(b.id)]?.likesCount ?? 0)) -
      (a.likes + (stats[String(a.id)]?.likesCount ?? 0))
    );
    const best = ranked.slice(0, Math.min(5, ranked.length));
    if (!best.length) return null;
    const dailyIndex = dayNumber % best.length;
    return best[dailyIndex];
  }, [allPhotos, dayNumber, stats]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function requireSignedIn(action: string) {
    if (user) return true;
    notify(`Sign in to save your ${action}.`);
    window.setTimeout(() => { window.location.href = "/login"; }, 900);
    return false;
  }

  function photoStats(photo: Photo) {
    return stats[String(photo.id)] ?? emptyStats;
  }

  function totalLikes(photo: Photo) {
    return photo.likes + photoStats(photo).likesCount;
  }

  function openPhoto(photo: Photo) {
    setComments([]);
    setSelected(photo);
  }

  async function toggleLike(photo: Photo) {
    if (!requireSignedIn("like") || !user) return;
    const key = String(photo.id);
    if (interactionBusy === `like-${key}`) return;
    setInteractionBusy(`like-${key}`);
    try {
      const result = await toggleSavedLike(photo.id, user);
      setStats((current) => ({
        ...current,
        [key]: { ...(current[key] ?? emptyStats), likesCount: result.likesCount, likedByCurrentUser: result.liked },
      }));
      notify(result.liked ? "Like saved" : "Like removed");
    } catch {
      notify("Like could not be saved. Please try again.");
    } finally {
      setInteractionBusy("");
    }
  }

  async function share(photo: Photo) {
    const data = { url: `${window.location.origin}${photoPath(photo)}` };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(data.url);
        notify("Link copied to clipboard");
      }
      if (user) {
        const sharesCount = await recordSavedShare(photo.id, user);
        const key = String(photo.id);
        setStats((current) => ({
          ...current,
          [key]: { ...(current[key] ?? emptyStats), sharesCount },
        }));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify("Share could not be completed.");
    }
  }

  async function download(photo: Photo) {
    setDownloadingId(photo.id);
    try {
      await downloadPublicPhoto({
        url: photo.sourceUrl ?? photo.src,
        title: photo.title,
        photographer: photo.photographer,
        alreadyWatermarked: photo.watermarked,
      });
      notify("Compressed copyright download ready");
    } catch {
      notify("Download could not be prepared. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function addComment(event: FormEvent) {
    event.preventDefault();
    if (!selected || !comment.trim()) return;
    if (!requireSignedIn("comment") || !user) return;
    setCommentBusy(true);
    try {
      await addPhotoComment(selected.id, user, comment);
      setComment("");
      setComments(await getPhotoComments(selected.id));
      notify("Comment saved");
    } catch {
      notify("Comment could not be saved. Please try again.");
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Luma by WildSaura home">LU<span>●</span>MA <small>by WildSaura</small></a>
        <nav aria-label="Main navigation">
          <a href="#discover">Discover</a>
          <a href="#collections">Collections</a>
          <a href="#about">About</a>
          <a href="/login">{user ? "My account" : "Sign in"}</a>
          <a href="https://www.wildsaura.com">WildSaura ↗</a>
        </nav>
        <a className="upload-button" href="/submit">
          <span className="upload-button-copy"><strong>Share your work</strong><small>Submit to LUMA</small></span>
          <span className="upload-button-icon" aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="discover">
        <div className="hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">Independent photography. Curated daily.</p>
            <h1>Images worth<br /><em>keeping.</em></h1>
          </div>
          {dailyHero && <figure className="hero-feature">
            <button type="button" onClick={() => openPhoto(dailyHero)} aria-label={`Open today's featured photograph, ${dailyHero.title}`}>
              <img src={dailyHero.src} alt={`${dailyHero.title}, photograph by ${dailyHero.photographer}`} />
            </button>
            <figcaption><span>Daily frame</span><strong>{dailyHero.title}</strong><small>by {dailyHero.photographer}</small></figcaption>
          </figure>}
        </div>
        <div className="hero-bottom">
          <p>Discover remarkable images from photographers everywhere. Free to explore, easy to share, ready to download.</p>
          <form className="search" onSubmit={(event) => event.preventDefault()}>
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, moods, creators…" aria-label="Search photos" />
            <kbd>⌘ K</kbd>
          </form>
        </div>
      </section>

      <section className="gallery-section" id="collections">
        <div className="filter-row">
          <div className="categories" aria-label="Photo categories">
            {categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
          <span className="result-count">{filtered.length.toString().padStart(2, "0")} photographs</span>
        </div>

        <div className="masonry">
          {filtered.map((photo, index) => {
            const currentStats = photoStats(photo);
            return <article className={`photo-card ${photo.height}`} key={photo.id}>
              <button type="button" className="image-button" onClick={() => openPhoto(photo)} aria-label={`Open ${photo.title}`}>
                <img src={photo.src} alt={`${photo.title}, photograph by ${photo.photographer}`} loading={index < 3 ? "eager" : "lazy"} />
              </button>
              <div className="photo-overlay">
                <div><strong>{photo.title}</strong><span>by {photo.photographer}</span></div>
                <div className="quick-actions">
                  <button type="button" data-tooltip={currentStats.likedByCurrentUser ? "Unlike" : "Like"} onClick={() => toggleLike(photo)} className={currentStats.likedByCurrentUser ? "liked" : ""} aria-label={currentStats.likedByCurrentUser ? "Unlike photo" : "Like photo"}><span aria-hidden="true">{currentStats.likedByCurrentUser ? "♥" : "♡"}</span></button>
                  <button type="button" data-tooltip="Share" onClick={() => share(photo)} aria-label="Share photo"><span aria-hidden="true">↗</span></button>
                  <button type="button" data-tooltip="Download" onClick={() => download(photo)} disabled={downloadingId === photo.id} aria-label="Download compressed copyright photo"><span aria-hidden="true">{downloadingId === photo.id ? "…" : "↓"}</span></button>
                </div>
              </div>
              <div className="mobile-meta">
                <button type="button" className="mobile-title" onClick={() => openPhoto(photo)}>{photo.title}<small>by {photo.photographer}</small></button>
                <div className="mobile-actions">
                  <button type="button" className={currentStats.likedByCurrentUser ? "liked" : ""} onClick={() => toggleLike(photo)} aria-label={currentStats.likedByCurrentUser ? "Unlike photo" : "Like photo"}><span aria-hidden="true">{currentStats.likedByCurrentUser ? "♥" : "♡"}</span><small>{totalLikes(photo)}</small></button>
                  <button type="button" onClick={() => share(photo)} aria-label="Share photo"><span aria-hidden="true">↗</span></button>
                  <button type="button" onClick={() => download(photo)} disabled={downloadingId === photo.id} aria-label="Download compressed copyright photo"><span aria-hidden="true">{downloadingId === photo.id ? "…" : "↓"}</span></button>
                </div>
              </div>
            </article>;
          })}
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
        <section className="lightbox" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" aria-labelledby="lightbox-title" role="dialog">
          <button type="button" className="close" onClick={() => setSelected(null)} aria-label="Close photograph">×</button>
          <div className="lightbox-image"><img src={selected.src} alt={selected.title} /><span>Compressed preview · © WildSaura</span></div>
          <aside>
            <span className="tag">{selected.category}</span>
            <h2 id="lightbox-title">{selected.title}</h2>
            <p>Photograph by <strong>{selected.photographer}</strong></p>
            <div className="detail-actions">
              <button type="button" onClick={() => toggleLike(selected)}><span className="action-symbol" aria-hidden="true">{photoStats(selected).likedByCurrentUser ? "♥" : "♡"}</span><span><strong>{photoStats(selected).likedByCurrentUser ? "Liked" : "Like photograph"}</strong><small>{totalLikes(selected).toLocaleString()} community saves</small></span></button>
              <button type="button" onClick={() => share(selected)}><span className="action-symbol" aria-hidden="true">↗</span><span><strong>Share photograph</strong><small>{photoStats(selected).sharesCount} recorded shares</small></span></button>
              <button type="button" onClick={() => download(selected)} disabled={downloadingId === selected.id}><span className="action-symbol" aria-hidden="true">↓</span><span><strong>{downloadingId === selected.id ? "Preparing…" : "Download preview"}</strong><small>Compressed · copyright marked</small></span></button>
              <a href="/premium"><span className="action-symbol" aria-hidden="true">✦</span><span><strong>Original quality</strong><small>Premium access · coming soon</small></span></a>
            </div>
            <div className="comments">
              <h3>Conversation <span>{comments.length}</span></h3>
              <form onSubmit={addComment}>
                <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder={user ? "Add a thoughtful comment…" : "Sign in to comment…"} />
                <button disabled={commentBusy}>{commentBusy ? "Saving…" : "Post"}</button>
              </form>
              {comments.map((item) => <p key={item.id}><strong>{item.displayName}</strong>{item.text}</p>)}
              {!comments.length && <small>Be the first to leave a comment.</small>}
            </div>
          </aside>
        </section>
      </div>}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </main>
  );
}
