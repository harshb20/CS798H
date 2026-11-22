"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BookOpen, Check, ClipboardList, FlaskConical, Layers3, ListChecks, Timer } from "lucide-react";
import { copy, workflows, type Answers, type Draft, type Language } from "../lib/forms";
import { mismatchFields, scenarioFields, scenarios, studyCsv, studyRows, susItems, tlxItems, type Scenario, type Session, type StudyEvent } from "../lib/study";
import { downloadFile } from "../lib/storage";
import { FormEditor } from "./form-editor";
import { Empty, modeLabel } from "./ui";

type SaveStatus = "saved" | "saving" | "error";
type SessionUpdate = (previous: Session) => Session;

export function StudyOverview({ lang, sessions, sequence, onStart }: { lang: Language; sessions: Session[]; sequence?: number; onStart: () => void }) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const [consent, setConsent] = useState(false);
  const pending = sessions.find((session) => !session.endedAt && session.conditions.some((condition) => !condition.sus || !condition.tlx));
  const rows = studyRows(sessions);
  const completeIds = new Set(sessions.filter((session) => session.conditions.every((task) => task.completedAt && task.sus && task.tlx)).map((session) => session.id));
  const complete = rows.filter((row) => completeIds.has(row.participant));
  const measures = [
    { field: "time_seconds", label: t("Completion time (s)", "पूरा करने का समय (सेकंड)") },
    { field: "input_errors", label: t("Input errors", "इनपुट त्रुटियाँ") },
    { field: "backtracks", label: t("Backtracks", "पिछले चरण पर लौटना") },
    { field: "sus", label: t("SUS (0–100)", "SUS (0–100)") },
    { field: "raw_tlx", label: t("Raw NASA-TLX (0–100)", "रॉ NASA-TLX (0–100)") },
  ] as const;
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });

  function exportData(format: "csv" | "json") {
    const content = format === "csv" ? studyCsv(sessions) : JSON.stringify({ version: 1, conditions: rows }, null, 2);
    downloadFile(`formflow-study.${format}`, new Blob([content], { type: format === "csv" ? "text/csv;charset=utf-8" : "application/json" }));
  }

  return <div className="study-page">
    <header className="page-heading"><div><h1>{t("Usability study", "उपयोगिता अध्ययन")}</h1><p>{t("Compare a guided interface and a single-page form across two sample tasks.", "दो नमूना कार्यों में चरणबद्ध और एक-पृष्ठ फ़ॉर्म की तुलना करें।")}</p></div></header>
    <div className="study-grid">
      <section className="panel study-start">
        <span className="workflow-icon scholarship"><FlaskConical size={24} aria-hidden /></span>
        <h2>{t("Participant session", "प्रतिभागी सत्र")}</h2>
        <p>{t("Complete two scholarship applications using fictional applicant details. After each task, answer a short usability and workload survey.", "काल्पनिक आवेदकों के विवरण से दो छात्रवृत्ति आवेदन पूरे करें। हर कार्य के बाद उपयोगिता और कार्यभार पर संक्षिप्त सर्वेक्षण भरें।")}</p>
        <div className="study-facts"><span><Timer size={16} aria-hidden /> {t("About 15 min", "लगभग 15 मिनट")}</span><span><Layers3 size={16} aria-hidden /> {t("2 layouts", "2 लेआउट")}</span><span><ClipboardList size={16} aria-hidden /> {t("2 surveys", "2 सर्वेक्षण")}</span></div>
        {sequence !== undefined && <p className="sequence-label">{t(`Assigned sequence: ${sequence}`, `निर्धारित क्रम ${sequence}`)}</p>}
        {pending ? <a className="button primary" href={`#study/${pending.id}`}>{t("Resume study", "अध्ययन जारी रखें")}<ArrowRight size={17} aria-hidden /></a> : <>
          <label className="check-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            {t("I agree to record task actions and survey answers on this device for the study.", "मैं अध्ययन के लिए अपनी कार्य गतिविधियाँ और सर्वेक्षण उत्तर इस डिवाइस पर सहेजने की सहमति देता/देती हूँ।")}
          </label>
          <button className="button primary" type="button" disabled={!consent} onClick={onStart}>{t("Start study", "अध्ययन शुरू करें")}<ArrowRight size={17} aria-hidden /></button>
        </>}
      </section>
      <section className="panel study-method">
        <span className="workflow-icon academic"><ListChecks size={24} aria-hidden /></span>
        <h2>{t("What is recorded", "क्या दर्ज होता है")}</h2>
        <p>{t("Completion time, validation errors and backward section navigation are recorded during each task. SUS measures perceived usability. Raw NASA-TLX measures perceived workload.", "हर कार्य में समय, सत्यापन त्रुटियाँ और पिछले अनुभाग पर लौटना दर्ज होता है। SUS उपयोगिता और रॉ NASA-TLX अनुभव किए गए कार्यभार को मापता है।")}</p>
        <p>{t("Research exports include a random session ID, survey responses and event timings. Use the fictional case data throughout.", "शोध डेटा में यादृच्छिक सत्र आईडी, सर्वेक्षण उत्तर और घटनाओं का समय होता है। पूरे अध्ययन में काल्पनिक उदाहरण का उपयोग करें।")}</p>
      </section>
    </div>
    <section className="block">
      <div className="section-heading"><div><h2>{t("Study results", "अध्ययन के परिणाम")}</h2><p>{completeIds.size} {t("completed paired sessions on this device", "पूर्ण युग्मित सत्र इस डिवाइस पर")}</p></div>
        <div className="button-group"><button className="button secondary" type="button" disabled={!rows.length} onClick={() => exportData("csv")}><ArrowDownToLine size={16} aria-hidden />CSV</button>
          <button className="button secondary" type="button" disabled={!rows.length} onClick={() => exportData("json")}><ArrowDownToLine size={16} aria-hidden />JSON</button></div>
      </div>
      {!rows.length ? <Empty lang={lang} kind="study" /> : completeIds.size === 0 ?
        <div className="empty">{t("Complete both tasks and surveys to see a paired comparison. Started tasks are available in the exports.", "युग्मित तुलना देखने के लिए दोनों कार्य और सर्वेक्षण पूरे करें। शुरू किए गए कार्य निर्यात में उपलब्ध हैं।")}</div> :
        <div className="table-wrap"><table className="data-table">
          <caption className="sr-only">{t("Means across completed paired sessions", "पूर्ण युग्मित सत्रों के औसत")}</caption>
          <thead><tr><th scope="col">{t("Average measure", "औसत माप")}</th><th scope="col">{modeLabel.guided[lang]}</th><th scope="col">{modeLabel.single[lang]}</th></tr></thead>
          <tbody>{measures.map(({ field, label }) => <tr key={field}><th scope="row">{label}</th>
            {(["guided", "single"] as const).map((mode) => <td key={mode}>{number.format(complete.filter((row) => row.mode === mode).reduce((sum, row) => sum + (row[field] ?? 0), 0) / completeIds.size)}</td>)}</tr>)}</tbody>
        </table></div>}
    </section>
  </div>;
}

function CaseInstructions({ scenario, lang, practice }: { scenario: Scenario; lang: Language; practice?: boolean }) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const caseDetails = <dl className="case-values">{Object.entries(scenarios[scenario]).map(([key, value]) => {
    const label = scenarioFields[key as keyof typeof scenarioFields][lang];
    const displayed = key === "scheme" ? workflows.scholarship.sections[1].fields[0].options?.find((option) => option.value === value)?.label[lang] : value;
    return <div key={key}><dt>{label}</dt><dd>{value.endsWith(".pdf") ? <a href={`study/${value}`} download><ArrowDownToLine size={16} aria-hidden />{value}</a> : <span lang={key === "statement" || key === "name" ? "en" : undefined}>{displayed}</span>}</dd></div>;
  })}</dl>;
  return practice ? <div className="case-data">{caseDetails}</div> :
    <details className="case-data case-details"><summary><BookOpen size={18} aria-hidden />{t("Open case details and documents", "उदाहरण का विवरण और दस्तावेज़ खोलें")}</summary>{caseDetails}</details>;
}

export function StudyRun({ session, lang, saveStatus, update, onEnd }: { session: Session; lang: Language; saveStatus: SaveStatus; update: (change: SessionUpdate) => void; onEnd: () => void }) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const [ending, setEnding] = useState(false);
  const index = session.conditions.findIndex((task) => !task.sus || !task.tlx);
  const task = session.conditions[index];

  function updateTask(change: (current: Session["conditions"][number]) => Session["conditions"][number]) {
    update((previous) => previous.endedAt ? previous : ({ ...previous, conditions: previous.conditions.map((current, position) => position === index ? change(current) : current) }));
  }

  function record(type: StudyEvent["type"], target?: string) {
    const now = Date.now();
    updateTask((current) => {
      if (!current.startedAt || current.completedAt) return current;
      return { ...current, events: [...current.events, { type, target, ms: Math.max(0, now - current.startedAt) }] };
    });
  }

  const back = <a href="#study" className="back-link"><ArrowLeft size={17} aria-hidden />{t("Usability study", "उपयोगिता अध्ययन")}</a>;
  if (!task || session.endedAt) return <>{back}<section className="panel completion">
    <span className="completion-icon"><Check size={29} aria-hidden /></span>
    <h1>{session.endedAt ? t("Session ended early", "सत्र समय से पहले समाप्त हुआ") : t("Session complete", "सत्र पूरा हुआ")}</h1>
    <p>{session.endedAt ? t("Recorded actions and completed surveys are available in the study exports.", "दर्ज गतिविधियाँ और पूरे हुए सर्वेक्षण अध्ययन निर्यात में उपलब्ध हैं।") : t("Both tasks and surveys are saved. You can view the comparison or export your session data.", "दोनों कार्य और सर्वेक्षण सहेजे गए हैं। आप तुलना देख सकते हैं या सत्र डेटा निर्यात कर सकते हैं।")}</p>
    <a href="#study" className="button primary">{t("View study results", "अध्ययन परिणाम देखें")}<ArrowRight size={17} aria-hidden /></a>
  </section></>;

  const controls = <><div className="study-run-top">{back}<button className="text-button" type="button" onClick={() => setEnding(!ending)} aria-expanded={ending}>{t("End session", "सत्र समाप्त करें")}</button></div>
    {ending && <div className="error-box"><span>{t("End this session and keep any research data recorded so far?", "यह सत्र समाप्त करके अब तक का अध्ययन डेटा सहेजें?")}</span><button className="text-button" type="button" onClick={onEnd}>{t("End now", "अभी समाप्त करें")}</button></div>}</>;
  const label = t(`Task ${index + 1} of 2`, `कार्य ${index + 1} / 2`);
  const heading = <div className="study-task-label">{label} <span>·</span> {modeLabel[task.mode][lang]}</div>;
  if (!task.startedAt) return <>{controls}<section className="panel case-intro">
    {heading}<h1>{t(`Scholarship case ${task.scenario}`, `छात्रवृत्ति उदाहरण ${task.scenario}`)}</h1>
    <p>{t("Use the case details to complete the application. Download the two documents below. Timing starts when you select Begin task.", "आवेदन में नीचे दिए गए विवरण का उपयोग करें। दोनों दस्तावेज़ डाउनलोड करें। कार्य शुरू करें चुनने पर समय दर्ज होना शुरू होगा।")}</p>
    <CaseInstructions scenario={task.scenario} lang={lang} practice />
    <button className="button primary" type="button" onClick={() => {
      const startedAt = Date.now();
      updateTask((current) => current.startedAt ? current : { ...current, startedAt, events: [{ type: "start", ms: 0 }] });
    }}>{t("Begin task", "कार्य शुरू करें")}<ArrowRight size={17} aria-hidden /></button>
  </section></>;

  if (task.completedAt) return <>{controls}{heading}<Survey key={index} lang={lang} onComplete={(sus, tlx) => {
    const now = Date.now();
    updateTask((current) => ({
      ...current, sus, tlx, events: [...current.events, { type: "survey", ms: Math.max(0, now - current.startedAt!) }],
    }));
    window.scrollTo(0, 0);
  }} /></>;

  const draft: Draft = {
    id: `${session.id}-${index}`, workflow: "scholarship", mode: task.mode,
    answers: task.answers, section: task.section, updatedAt: task.startedAt,
  };
  return <>{controls}{heading}<CaseInstructions scenario={task.scenario} lang={lang} />
    <FormEditor key={draft.id} workflow={workflows.scholarship} draft={draft} lang={lang} saveStatus={saveStatus}
      onChange={({ answers, section }) => updateTask((current) => ({ ...current, answers: answers ?? current.answers, section: section ?? current.section }))}
      checkScenario={(answers) => mismatchFields(task.scenario, answers)}
      log={record} onSubmit={() => {
        const completedAt = Date.now();
        updateTask((current) => current.completedAt ? current : {
          ...current, completedAt: Math.max(completedAt, current.startedAt!), answers: {},
          events: [...current.events, { type: "submit", ms: Math.max(0, completedAt - current.startedAt!) }],
        });
        window.scrollTo(0, 0);
      }} />
  </>;
}

function Survey({ lang, onComplete }: { lang: Language; onComplete: (sus: number[], tlx: number[]) => void }) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const [sus, setSus] = useState<Record<number, number>>({});
  const [tlx, setTlx] = useState<Record<number, number>>({});
  const complete = Object.keys(sus).length === susItems.length && Object.keys(tlx).length === tlxItems.length;
  const question = (name: string, index: number, label: string, children: ReactNode) => <div className="survey-item" key={name}>
    <label htmlFor={name}>{index + 1}. {label}</label>{children}
  </div>;

  return <form className="panel survey" onSubmit={(event) => {
    event.preventDefault();
    if (complete) onComplete(susItems.map((_, index) => sus[index]), tlxItems.map((_, index) => tlx[index]));
  }}>
    <h1>{t("Post-task survey", "कार्य के बाद सर्वेक्षण")}</h1>
    <p>{t("Rate the layout you just used.", "अभी उपयोग किए गए लेआउट को रेट करें।")}</p>
    <h2>{t("System Usability Scale", "प्रणाली उपयोगिता पैमाना (SUS)")}</h2>
    <p>{t("1 means strongly disagree. 5 means strongly agree.", "1 का अर्थ पूरी तरह असहमत और 5 का अर्थ पूरी तरह सहमत है।")}</p>
    {susItems.map((item, index) => question(`sus-${index}`, index, item[lang], <select required id={`sus-${index}`} value={sus[index] ?? ""} onChange={(event) => {
      const value = event.target.value;
      setSus((previous) => { const next = { ...previous }; if (value) next[index] = Number(value); else delete next[index]; return next; });
    }}><option value="">{t("Choose", "चुनें")}</option>{[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}</select>))}
    <h2>{t("NASA Task Load Index", "NASA कार्यभार सूचकांक")}</h2>
    <p>{t("Rate each dimension from 0 (low) to 100 (high). For performance, 0 means successful and 100 means unsuccessful.", "हर आयाम को 0 (कम) से 100 (अधिक) तक अंक दें। प्रदर्शन के लिए 0 का अर्थ सफल और 100 का अर्थ असफल है।")}</p>
    {tlxItems.map((item, index) => question(`tlx-${index}`, index, item[lang], <select required id={`tlx-${index}`} value={tlx[index] ?? ""} onChange={(event) => {
      const value = event.target.value;
      setTlx((previous) => { const next = { ...previous }; if (value) next[index] = Number(value); else delete next[index]; return next; });
    }}><option value="">{t("Choose", "चुनें")}</option>{Array.from({ length: 21 }, (_, index) => index * 5).map((value) => <option key={value}>{value}</option>)}</select>))}
    <button className="button primary" type="submit">{t("Save survey", "सर्वेक्षण सहेजें")}<Check size={17} aria-hidden /></button>
  </form>;
}
