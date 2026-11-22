"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronRight, CircleHelp, ClipboardList, FileStack, FlaskConical, Globe2, LayoutGrid, Menu, Printer, Search, ShieldCheck, X } from "lucide-react";
import { copy, workflows, type Answers, type Draft, type Language, type Submission, type WorkflowId } from "../lib/forms";
import { initialData, loadWorkspace, saveWorkspace, type WorkspaceUpdate } from "../lib/storage";
import { createSession } from "../lib/study";
import { FormEditor } from "./form-editor";
import { StudyOverview, StudyRun } from "./study-panel";
import { AnswerSummary, Brand, Empty, formatDate, HeroArt, modeLabel, WorkflowCard, WorkflowIcon } from "./ui";

const navigation = [
  { id: "overview", label: copy("Overview", "अवलोकन"), icon: LayoutGrid },
  { id: "forms", label: copy("Form catalog", "फ़ॉर्म सूची"), icon: FileStack },
  { id: "applications", label: copy("My applications", "मेरे आवेदन"), icon: ClipboardList },
  { id: "study", label: copy("Usability study", "उपयोगिता अध्ययन"), icon: FlaskConical },
] as const;

function useWorkspace() {
  const [data, setData] = useState(initialData);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const pending = useRef<WorkspaceUpdate[]>([]);
  const writing = useRef(false);

  useEffect(() => {
    let active = true;
    loadWorkspace().then(
      (loaded) => { if (active) { setData(loaded); setReady(true); } },
      () => { if (active) { setSaveStatus("error"); setReady(true); } },
    );
    return () => { active = false; };
  }, []);

  async function flush() {
    if (writing.current || !pending.current.length) return;
    writing.current = true;
    setSaveStatus("saving");
    try {
      while (pending.current.length) {
        const batch = pending.current.slice();
        const persisted = await saveWorkspace((previous) => batch.reduce((current, update) => update(current), previous));
        pending.current.splice(0, batch.length);
        if (!pending.current.length) setData(persisted);
      }
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    } finally {
      writing.current = false;
    }
  }

  function update(change: WorkspaceUpdate) {
    setData((previous) => change(previous));
    pending.current.push(change);
    void flush();
  }

  async function retry() {
    if (pending.current.length) return flush();
    try {
      const loaded = await loadWorkspace();
      if (!pending.current.length && !writing.current) {
        setData(loaded);
        setSaveStatus("saved");
      }
    } catch {
      setSaveStatus("error");
    }
  }

  return { data, ready, saveStatus, update, retry };
}

function readRoute() {
  return window.location.hash.slice(1) || "overview";
}

export default function Workspace() {
  const { data, ready, saveStatus, update, retry } = useWorkspace();
  const [route, setRoute] = useState("overview");
  const [menu, setMenu] = useState(false);
  const lang = data.lang;
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const [area, detail] = route.split("/");
  const currentNav = navigation.find((item) => item.id === area) ?? navigation[0];
  const workflow = area === "forms" && Object.hasOwn(workflows, detail ?? "") ? workflows[detail as WorkflowId] : undefined;
  const draft = workflow ? data.drafts[workflow.id] : undefined;
  const submission = area === "applications" && detail ? data.submissions.find((item) => item.id === detail) : undefined;
  const session = area === "study" && detail ? data.sessions.find((item) => item.id === detail) : undefined;
  const sequence = area === "study" && detail && /^sequence-[0-3]$/.test(detail) ? Number(detail.at(-1)) : undefined;

  useEffect(() => {
    function syncRoute() {
      setRoute(readRoute());
      setMenu(false);
      window.scrollTo(0, 0);
      document.getElementById("main-content")?.focus({ preventScroll: true });
    }
    setRoute(readRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    if (!menu) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(false);
        document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menu]);

  useEffect(() => {
    if (!ready || !workflow || draft) return;
    const fresh: Draft = { id: crypto.randomUUID(), workflow: workflow.id, mode: "guided", answers: {}, section: workflow.sections[0].id, updatedAt: Date.now() };
    update((previous) => previous.drafts[workflow.id] ? previous : { ...previous, drafts: { ...previous.drafts, [workflow.id]: fresh } });
    // Draft creation runs on entry and the update checks for any stored draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, ready, workflow]);

  function go(path: string) { setRoute(path); window.location.hash = path; }

  function submitDraft(current: Draft, answers: Answers) {
    const receipt: Submission = { id: current.id, workflow: current.workflow, mode: current.mode, answers, submittedAt: Date.now() };
    go(`applications/${receipt.id}`);
    update((previous) => {
      if (previous.submissions.some((item) => item.id === receipt.id)) return previous;
      const drafts = { ...previous.drafts };
      if (drafts[current.workflow]?.id === current.id) delete drafts[current.workflow];
      return { ...previous, drafts, submissions: [receipt, ...previous.submissions] };
    });
  }

  let content;
  if (!ready && area !== "overview" && area !== "forms") {
    content = <p role="status">{t("Loading workspace…", "कार्यक्षेत्र लोड हो रहा है…")}</p>;
  } else if (workflow) {
    content = <><a className="back-link" href="#forms"><ArrowLeft size={17} aria-hidden />{t("Form catalog", "फ़ॉर्म सूची")}</a>
      {draft ? <FormEditor key={draft.id} workflow={workflow} draft={draft} lang={lang} saveStatus={saveStatus}
        onChange={(changes) => {
          const updatedAt = Date.now();
          update((previous) => {
            const current = previous.drafts[workflow.id];
            return current?.id === draft.id
              ? { ...previous, drafts: { ...previous.drafts, [workflow.id]: { ...current, ...changes, updatedAt } } }
              : previous;
          });
        }} onSubmit={(answers) => submitDraft(draft, answers)} /> : <p role="status">{t("Opening draft…", "मसौदा खोला जा रहा है…")}</p>}</>;
  } else if (area === "forms") {
    content = <Catalog lang={lang} drafts={data.drafts} />;
  } else if (submission) {
    content = <Receipt submission={submission} lang={lang} />;
  } else if (area === "applications") {
    content = <><header className="page-heading"><div><h1>{t("My applications", "मेरे आवेदन")}</h1><p>{t("Resume a draft or open a copy of a submitted request.", "मसौदा जारी रखें या सबमिट किए गए अनुरोध की प्रति खोलें।")}</p></div>
      <a className="button primary" href="#forms">{t("Browse forms", "फ़ॉर्म देखें")}<ArrowRight size={17} aria-hidden /></a>
    </header><Activity drafts={data.drafts} submissions={data.submissions} lang={lang} /></>;
  } else if (session) {
    content = <StudyRun key={session.id} session={session} lang={lang} saveStatus={saveStatus}
      update={(change) => update((previous) => ({ ...previous, sessions: previous.sessions.map((item) => item.id === session.id ? change(item) : item) }))}
      onEnd={() => {
        const endedAt = Date.now();
        update((previous) => ({
          ...previous,
          sessions: previous.sessions.map((item) => item.id === session.id && item.conditions.some((task) => !task.sus || !task.tlx)
            ? { ...item, endedAt, conditions: item.conditions.map((task) => ({ ...task, answers: {} })) } : item),
        }));
        go(`study/${session.id}`);
      }} />;
  } else if (area === "study") {
    content = <StudyOverview lang={lang} sessions={data.sessions} sequence={sequence} onStart={() => {
      const session = createSession(sequence ?? data.sessions.length);
      update((previous) => {
        // Preserve the issued participant ID while assigning the order on the stored count.
        const assigned = createSession(sequence ?? previous.sessions.length, session.id, session.createdAt);
        return { ...previous, sessions: [...previous.sessions, assigned] };
      });
      go(`study/${session.id}`);
    }} />;
  } else if (area === "help") {
    content = <Help lang={lang} />;
  } else {
    content = <>
      <header className="hero">
        <div className="hero-content"><p className="hero-label"><span />{t("Your campus workspace", "आपका कैंपस कार्यक्षेत्र")}</p>
          <h1>{t("Campus paperwork,", "कैंपस की काग़ज़ी प्रक्रिया,")}<br /><em>{t("made simpler.", "अब और आसान।")}</em></h1>
          <p className="hero-description">{t("Apply for support, claim expenses, and make academic requests from one place.", "सहायता के लिए आवेदन करें, व्यय का दावा करें और शैक्षणिक अनुरोध एक ही जगह से भेजें।")}</p>
          <a href="#forms" className="button primary">{t("Browse forms", "फ़ॉर्म देखें")}<ArrowRight size={18} aria-hidden /></a>
        </div>
        <HeroArt />
      </header>
      <section className="block">
        <div className="section-heading"><div><h2>{t("Available forms", "उपलब्ध फ़ॉर्म")}</h2><p>{t("Choose a request to get started.", "शुरू करने के लिए अनुरोध चुनें।")}</p></div>
          <a className="subtle-link" href="#forms">{t("View catalog", "पूरी सूची देखें")} <ArrowUpRight size={16} aria-hidden /></a></div>
        <div className="workflow-grid">{Object.values(workflows).map((item) => <WorkflowCard key={item.id} workflow={item} lang={lang} draft={Boolean(data.drafts[item.id])} />)}</div>
      </section>
      <section className="block activity-block">
        <div className="section-heading"><div><h2>{t("Recent activity", "हाल की गतिविधि")}</h2><p>{t("Pick up where you left off.", "जहाँ रुके थे, वहीं से जारी रखें।")}</p></div>
          <a className="subtle-link" href="#applications">{t("My applications", "मेरे आवेदन")} <ArrowUpRight size={16} aria-hidden /></a></div>
        <Activity drafts={data.drafts} submissions={data.submissions} lang={lang} limit={3} />
      </section>
    </>;
  }

  return <div className="shell">
    <a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>{t("Skip to content", "सामग्री पर जाएँ")}</a>
    {menu && <button type="button" className="mobile-overlay" aria-label={t("Close menu", "मेनू बंद करें")} onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "open" : ""}`} id="primary-sidebar">
      <Brand lang={lang} />
      <nav aria-label={t("Workspace navigation", "कार्यक्षेत्र नेविगेशन")}>
        <p>{t("Workspace", "कार्यक्षेत्र")}</p>
        {navigation.slice(0, 3).map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} onClick={() => setMenu(false)} aria-current={area === id ? "page" : undefined}>
          <Icon size={19} aria-hidden />{label[lang]}</a>)}
        <p className="nav-secondary-label">{t("Research", "शोध")}</p>
        <a href="#study" onClick={() => setMenu(false)} aria-current={area === "study" ? "page" : undefined}><FlaskConical size={19} aria-hidden />{navigation[3].label[lang]}</a>
      </nav>
      <div className="sidebar-footer">
        <a href="#help" onClick={() => setMenu(false)} aria-current={area === "help" ? "page" : undefined}><CircleHelp size={18} aria-hidden />{t("Help & storage", "सहायता और संग्रहण")}</a>
        <div className="footer-local"><ShieldCheck size={16} aria-hidden /><span>{t("Local workspace", "स्थानीय कार्यक्षेत्र")}</span></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumbs">
          <button type="button" className="icon-button menu-toggle" aria-expanded={menu} aria-controls="primary-sidebar" aria-label={menu ? t("Close menu", "मेनू बंद करें") : t("Open menu", "मेनू खोलें")} onClick={() => setMenu(!menu)}>{menu ? <X size={23} /> : <Menu size={23} />}</button>
          <span className="breadcrumb-root">{t("Workspace", "कार्यक्षेत्र")}</span><ChevronRight className="breadcrumb-chevron" size={15} aria-hidden /><strong>{area === "help" ? t("Help & storage", "सहायता और संग्रहण") : currentNav.label[lang]}</strong>
        </div>
        <div className="top-right">
          <div className="lang-control" role="group" aria-label={t("Language", "भाषा")}>
            <Globe2 size={16} aria-hidden />
            <button type="button" aria-label="English" aria-pressed={lang === "en"} disabled={!ready} onClick={() => update((previous) => ({ ...previous, lang: "en" }))}>EN</button>
            <button type="button" aria-label="हिन्दी" aria-pressed={lang === "hi"} disabled={!ready} lang="hi" onClick={() => update((previous) => ({ ...previous, lang: "hi" }))}>हिन्दी</button>
          </div>
          <span className="top-divider" />
          <span className="avatar" aria-hidden="true">FF</span>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="main-content">
        {saveStatus === "error" && <div className="error-box storage-error" role="alert"><span>{t("Browser storage is unavailable. Changes may be lost when you leave.", "ब्राउज़र संग्रहण उपलब्ध नहीं है। पृष्ठ छोड़ने पर बदलाव मिट सकते हैं।")}</span>
          <button className="text-button" type="button" onClick={retry}>{t("Retry", "फिर प्रयास करें")}</button></div>}
        {content}
      </main>
    </div>
  </div>;
}

function Catalog({ lang, drafts }: { lang: Language; drafts: Partial<Record<WorkflowId, Draft>> }) {
  const [search, setSearch] = useState("");
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const hits = Object.values(workflows).filter((workflow) =>
    [workflow.title[lang], workflow.category[lang], workflow.description[lang]].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return <>
    <header className="page-heading"><div><h1>{t("Form catalog", "फ़ॉर्म सूची")}</h1><p>{t("Find the right form for your campus request.", "अपने कैंपस अनुरोध के लिए सही फ़ॉर्म खोजें।")}</p></div>
      <label className="search-box"><Search size={19} aria-hidden /><input value={search} type="search" aria-label={t("Search forms", "फ़ॉर्म खोजें")} placeholder={t("Search forms…", "फ़ॉर्म खोजें…")} onChange={(event) => setSearch(event.target.value)} /></label>
    </header>
    {hits.length ? <div className="workflow-grid">{hits.map((workflow) => <WorkflowCard key={workflow.id} workflow={workflow} lang={lang} draft={Boolean(drafts[workflow.id])} />)}</div> : <div className="empty">{t("No forms match your search.", "आपकी खोज से कोई फ़ॉर्म नहीं मिला।")}</div>}
  </>;
}

function Activity({ drafts, submissions, lang, limit }: {
  drafts: Partial<Record<WorkflowId, Draft>>; submissions: Submission[]; lang: Language; limit?: number;
}) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const rows = [
    ...Object.values(drafts).map((draft) => ({ id: draft.id, workflow: draft.workflow, timestamp: draft.updatedAt, href: `#forms/${draft.workflow}`, draft: true })),
    ...submissions.map((submission) => ({ id: submission.id, workflow: submission.workflow, timestamp: submission.submittedAt, href: `#applications/${submission.id}`, draft: false })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  if (!rows.length) return <Empty lang={lang} kind="applications" />;
  return <div className="table-wrap"><table className="data-table activity-table">
    <caption className="sr-only">{t("Application activity", "आवेदन गतिविधि")}</caption>
    <thead><tr><th scope="col">{t("Application", "आवेदन")}</th><th scope="col">{t("Status", "स्थिति")}</th><th scope="col">{t("Last updated", "अंतिम बदलाव")}</th><th scope="col"><span className="sr-only">{t("Action", "कार्रवाई")}</span></th></tr></thead>
    <tbody>{rows.map((item) => <tr key={item.id}>
      <th scope="row"><span className="row-workflow"><WorkflowIcon id={item.workflow} small />{workflows[item.workflow].title[lang]}</span></th>
      <td><span className={`status-badge ${item.draft ? "draft" : "submitted"}`}><span />{item.draft ? t("Draft", "मसौदा") : t("Submitted", "सबमिट किया गया")}</span></td>
      <td><time dateTime={new Date(item.timestamp).toISOString()}>{formatDate(item.timestamp, lang)}</time></td>
      <td><a href={item.href} className="row-link" aria-label={`${item.draft ? t("Resume", "जारी रखें") : t("View", "देखें")} ${workflows[item.workflow].title[lang]}`}><ArrowUpRight size={18} aria-hidden /></a></td>
    </tr>)}</tbody>
  </table></div>;
}

function Receipt({ submission, lang }: { submission: Submission; lang: Language }) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const workflow = workflows[submission.workflow];
  return <>
    <a className="back-link" href="#applications"><ArrowLeft size={17} aria-hidden />{t("My applications", "मेरे आवेदन")}</a>
    <div className="receipt">
      <header className="page-heading receipt-heading"><div>
        <div className="status-badge submitted"><span />{t("Submitted locally", "स्थानीय रूप से सबमिट")}</div>
        <h1>{workflow.title[lang]}</h1>
        <p>{formatDate(submission.submittedAt, lang)} · {modeLabel[submission.mode][lang]} · <span className="receipt-id">{submission.id.slice(0, 8).toUpperCase()}</span></p>
      </div><button className="button primary print-button" type="button" onClick={() => {
        const title = document.title;
        document.title = `FormFlow-${submission.workflow}-${submission.id.slice(0, 8)}`;
        window.print();
        document.title = title;
      }}><Printer size={17} aria-hidden />{t("Export PDF", "PDF निर्यात करें")}</button></header>
      <p className="print-hint">{t("In the print dialog, choose Save as PDF.", "प्रिंट संवाद में PDF के रूप में सहेजें चुनें।")}</p>
      <div className="panel"><AnswerSummary workflow={workflow} answers={submission.answers} lang={lang} /></div>
    </div>
  </>;
}

function Help({ lang }: { lang: Language }) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  return <><header className="page-heading"><div><h1>{t("Help & storage", "सहायता और संग्रहण")}</h1><p>{t("How FormFlow handles your work.", "FormFlow आपके काम को कैसे संभालता है।")}</p></div></header>
    <div className="panel help-panel">
      <h2>{t("Where are my forms saved?", "मेरे फ़ॉर्म कहाँ सहेजे जाते हैं?")}</h2><p>{t("Drafts, attachments, receipts and study sessions stay in this browser. Clearing site data removes them.", "मसौदे, संलग्नक, रसीदें और अध्ययन सत्र इसी ब्राउज़र में रहते हैं। साइट डेटा साफ़ करने पर ये मिट जाएँगे।")}</p>
      <h2>{t("Where do submissions go?", "सबमिट किए गए आवेदन कहाँ जाते हैं?")}</h2><p>{t("This prototype saves a receipt in My applications. To share a copy, open the receipt and choose Export PDF.", "यह प्रोटोटाइप मेरे आवेदन में रसीद सहेजता है। प्रति साझा करने के लिए रसीद खोलें और PDF निर्यात करें चुनें।")}</p>
      <h2>{t("Can I switch layouts?", "क्या मैं लेआउट बदल सकता/सकती हूँ?")}</h2><p>{t("Select Guided form or Single-page form in any regular application. Both layouts use your saved answers. Study layouts are assigned when a session starts.", "सामान्य आवेदन में चरणबद्ध या एक-पृष्ठ फ़ॉर्म चुनें। दोनों में आपके सहेजे गए उत्तर आते हैं। अध्ययन का लेआउट सत्र शुरू होने पर तय होता है।")}</p>
    </div></>;
}
