"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { AuthPanel } from "@/components/auth-panel";
import { auth, isAdminEmail } from "@/lib/firebase";
import { createSubmission, getAllSubmissions, reviewSubmission, type Submission, type SubmissionStatus } from "@/lib/submissions";

const categories = ["Nature","People","Architecture","Travel","Street","Fashion","Food","Interiors","Wildlife","Birds","Landscapes"];

export function AdminDashboard() {
  const [user,setUser]=useState<User|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [items,setItems]=useState<Submission[]>([]);
  const [filter,setFilter]=useState<SubmissionStatus|"all">("pending");
  const [selected,setSelected]=useState<Submission|null>(null);
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);
  const [view,setView]=useState<"review"|"upload">("review");
  const [uploadMessage,setUploadMessage]=useState("");
  const [selectedFileName,setSelectedFileName]=useState("");

  async function load(){ setItems(await getAllSubmissions()); }
  useEffect(()=>onAuthStateChanged(auth,(current)=>{setUser(current);setAuthReady(true);if(isAdminEmail(current?.email)) load().catch(()=>setItems([]));}),[]);
  const visible=useMemo(()=>filter==="all"?items:items.filter((item)=>item.status===filter),[items,filter]);
  const counts={pending:items.filter(i=>i.status==="pending").length,approved:items.filter(i=>i.status==="approved").length,rejected:items.filter(i=>i.status==="rejected").length};

  async function review(status:SubmissionStatus){
    if(!selected||!user?.email)return; setBusy(true);
    try { await reviewSubmission(selected.id,status,note,user.email); setSelected(null);setNote("");await load(); }
    finally { setBusy(false); }
  }

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!user?.email)return;
    const formElement=event.currentTarget;
    const form=new FormData(formElement);
    const file=form.get("photo");
    if(!(file instanceof File)||!file.size)return setUploadMessage("Please select a photograph.");
    if(file.size>20*1024*1024)return setUploadMessage("Image must be 20MB or smaller.");
    setBusy(true);setUploadMessage("");
    try{
      await createSubmission({
        file,
        title:String(form.get("title")??"").trim(),
        category:String(form.get("category")??"").trim(),
        description:String(form.get("description")??"").trim(),
        photographerName:String(form.get("photographerName")??"").trim(),
        user:{uid:user.uid,email:user.email},
        status:"approved",
      });
      formElement.reset();
      setSelectedFileName("");
      setUploadMessage("Published successfully. The photograph is now live in the gallery.");
      await load();
    }catch{
      setUploadMessage("Upload failed. Please check the image and try again.");
    }finally{setBusy(false);}
  }

  if(!authReady)return <main className="auth-page"><p>Loading secure admin…</p></main>;
  if(!user)return <AuthPanel purpose="admin"/>;
  if(!isAdminEmail(user.email))return <main className="access-denied"><h1>Admin access required.</h1><p>Signed in as {user.email}. This address is not on the WildSaura admin allowlist.</p><button onClick={()=>signOut(auth)}>Sign in with another account</button><a href="/">Return to gallery</a></main>;

  return <main className="admin-page">
    <aside className="admin-sidebar"><a className="brand" href="/">LU<span>●</span>MA <small>admin</small></a><nav><button className={view==="upload"?"active":""} onClick={()=>setView("upload")}>Upload photo<span>＋</span></button>{(["pending","approved","rejected","all"] as const).map((f)=><button className={view==="review"&&filter===f?"active":""} onClick={()=>{setView("review");setFilter(f)}} key={f}>{f}<span>{f==="all"?items.length:counts[f]}</span></button>)}</nav><div><small>{user.email}</small><button onClick={()=>signOut(auth)}>Sign out</button></div></aside>
    <section className="admin-main"><header><div><span className="legal-kicker">WildSaura editorial</span><h1>{view==="upload"?"Publish photo":"Review queue"}</h1></div><a href="/" target="_blank">Open gallery ↗</a></header>
      {view==="upload"?<section className="admin-upload-panel">
        <div><h2>Upload directly to LUMA</h2><p>Admin uploads are approved automatically and appear in the public gallery immediately.</p></div>
        <form className="submission-form" onSubmit={upload}>
          <label className="dropzone large">
            <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event)=>setSelectedFileName(event.target.files?.[0]?.name??"")}/>
            <b>{selectedFileName?"Photograph selected":"Select your photograph"}</b>
            <span className={selectedFileName?"selected-file":""}>{selectedFileName||"Tap or click here · JPG, PNG or WEBP · maximum 20MB"}</span>
          </label>
          <div className="form-pair"><label>Photograph title<input name="title" maxLength={140} required/></label><label>Photographer name<input name="photographerName" defaultValue={user.displayName??"WildSaura"} maxLength={100} required/></label></div>
          <label>Category<select name="category" required defaultValue=""><option value="" disabled>Choose one</option>{categories.map((category)=><option key={category}>{category}</option>)}</select></label>
          <label>Story or description<textarea name="description" maxLength={1000} placeholder="Add the location, story or context…"/></label>
          <button className="publish" disabled={busy}>{busy?"Uploading…":"Publish to gallery ↗"}</button>
          {uploadMessage&&<p className="form-message">{uploadMessage}</p>}
        </form>
      </section>:<>
        <div className="review-grid">{visible.map((item)=><button className="review-card" key={item.id} onClick={()=>{setSelected(item);setNote(item.adminNote)}}><img src={item.downloadUrl} alt={item.title}/><div><span className={`status ${item.status}`}>{item.status}</span><h2>{item.title}</h2><p>{item.photographerName} · {item.category}</p><small>{item.createdAt?.toLocaleString() ?? "Just now"}</small></div></button>)}</div>
        {!visible.length&&<div className="empty">Nothing in this queue.</div>}
      </>}
    </section>
    {selected&&<div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><section className="review-modal" onMouseDown={(e)=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><div className="review-image"><img src={selected.downloadUrl} alt={selected.title}/></div><aside><span className="tag">{selected.category}</span><h2>{selected.title}</h2><p>By <b>{selected.photographerName}</b><br/>{selected.submitterEmail}</p><p className="review-story">{selected.description||"No description provided."}</p><label>Private note<textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional feedback for photographer"/></label><div className="review-actions"><button disabled={busy} onClick={()=>review("rejected")}>Reject</button><button disabled={busy} onClick={()=>review("pending")}>Keep pending</button><button disabled={busy} onClick={()=>review("approved")}>Approve & publish ↗</button></div></aside></section></div>}
  </main>;
}
