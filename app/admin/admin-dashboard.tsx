"use client";

import { useEffect, useMemo, useState } from "react";

type Submission = { id:string; title:string; category:string; description:string; photographerName:string; submitterEmail:string; status:"pending"|"approved"|"rejected"; adminNote:string; createdAt:string; imageUrl:string };

export function AdminDashboard({ adminEmail, signOutPath }:{adminEmail:string;signOutPath:string}) {
  const [items,setItems]=useState<Submission[]>([]);
  const [filter,setFilter]=useState("pending");
  const [selected,setSelected]=useState<Submission|null>(null);
  const [note,setNote]=useState("");
  const [busy,setBusy]=useState(false);

  async function load(){ const r=await fetch("/api/submissions"); if(r.ok) setItems(((await r.json()) as {submissions:Submission[]}).submissions); }
  useEffect(()=>{load();},[]);
  const visible=useMemo(()=>filter==="all"?items:items.filter((item)=>item.status===filter),[items,filter]);
  const counts={pending:items.filter(i=>i.status==="pending").length,approved:items.filter(i=>i.status==="approved").length,rejected:items.filter(i=>i.status==="rejected").length};

  async function review(status:"approved"|"rejected"|"pending"){
    if(!selected)return; setBusy(true);
    const r=await fetch(`/api/submissions/${selected.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,adminNote:note})});
    setBusy(false); if(r.ok){setSelected(null);setNote("");load();}
  }

  return <main className="admin-page">
    <aside className="admin-sidebar"><a className="brand" href="/">LU<span>●</span>MA <small>admin</small></a><nav>{["pending","approved","rejected","all"].map((f)=><button className={filter===f?"active":""} onClick={()=>setFilter(f)} key={f}>{f}<span>{f==="all"?items.length:counts[f as keyof typeof counts]}</span></button>)}</nav><div><small>{adminEmail}</small><a href={signOutPath}>Sign out</a></div></aside>
    <section className="admin-main"><header><div><span className="legal-kicker">WildSaura editorial</span><h1>Review queue</h1></div><a href="/" target="_blank">Open gallery ↗</a></header>
      <div className="review-grid">{visible.map((item)=><button className="review-card" key={item.id} onClick={()=>{setSelected(item);setNote(item.adminNote)}}><img src={item.imageUrl} alt={item.title}/><div><span className={`status ${item.status}`}>{item.status}</span><h2>{item.title}</h2><p>{item.photographerName} · {item.category}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></button>)}</div>
      {!visible.length&&<div className="empty">Nothing in this queue.</div>}
    </section>
    {selected&&<div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><section className="review-modal" onMouseDown={(e)=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}>×</button><div className="review-image"><img src={selected.imageUrl} alt={selected.title}/></div><aside><span className="tag">{selected.category}</span><h2>{selected.title}</h2><p>By <b>{selected.photographerName}</b><br/>{selected.submitterEmail}</p><p className="review-story">{selected.description||"No description provided."}</p><label>Private note<textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Optional feedback for photographer"/></label><div className="review-actions"><button disabled={busy} onClick={()=>review("rejected")}>Reject</button><button disabled={busy} onClick={()=>review("pending")}>Keep pending</button><button disabled={busy} onClick={()=>review("approved")}>Approve & publish ↗</button></div></aside></section></div>}
  </main>;
}
