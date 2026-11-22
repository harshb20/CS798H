"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleAlert, CloudCheck, FileText, List, PanelsTopLeft, Upload, X } from "lucide-react";
import { activeAnswers, attachmentAccept, copy, isAttachment, sectionReview, validateField, visibleFields, type Answers, type Draft, type Field, type Language, type Mode, type Value, type Workflow } from "../lib/forms";
import { type StudyEvent } from "../lib/study";
import { AnswerSummary, modeLabel, reviewTitle } from "./ui";

type Log = (type: StudyEvent["type"], target?: string) => void;

export function FormEditor({ workflow, draft, lang, saveStatus, onChange, onSubmit, log, checkScenario }: {
  workflow: Workflow;
  draft: Draft;
  lang: Language;
  saveStatus: "saved" | "saving" | "error";
  onChange: (changes: Partial<Draft>) => void;
  onSubmit: (answers: Answers) => void;
  log?: Log;
  checkScenario?: (answers: Answers) => string[];
}) {
  const t = (en: string, hi: string) => copy(en, hi)[lang];
  const { answers, mode, section } = draft;
  const reviewing = section === sectionReview;
  const guided = mode === "guided";
  const sections = workflow.sections.filter((item) => visibleFields(item, answers).length);
  const index = sections.findIndex((item) => item.id === section);
  const step = reviewing ? sections.length : Math.max(0, index);
  const current = sections[step];
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [scenarioErrors, setScenarioErrors] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const invalidEpisodes = useRef(new Set<string>());
  const focusingError = useRef(false);

  function noteInvalid(type: "validation-error" | "scenario-error", field: string) {
    const key = `${type}:${field}`;
    if (invalidEpisodes.current.has(key)) return;
    invalidEpisodes.current.add(key);
    log?.(type, field);
  }

  function touch(field: Field) {
    setTouched((previous) => new Set(previous).add(field.id));
    if (validateField(field, answers, lang)) noteInvalid("validation-error", field.id);
  }

  function changeValue(field: Field, value: Value | undefined) {
    const next = { ...answers };
    if (value === undefined) delete next[field.id];
    else next[field.id] = value;
    const error = validateField(field, next, lang);
    if (isAttachment(value) && error) {
      noteInvalid("validation-error", field.id);
      setUploadErrors((previous) => ({ ...previous, [field.id]: error }));
      return;
    }
    if (!error) invalidEpisodes.current.delete(`validation-error:${field.id}`);
    invalidEpisodes.current.delete(`scenario-error:${field.id}`);
    setScenarioErrors((previous) => previous.filter((id) => id !== field.id));
    setUploadErrors((previous) => ({ ...previous, [field.id]: "" }));
    const active = activeAnswers(workflow, next);
    const visible = new Set(sections.flatMap((item) => visibleFields(item, active)).map((item) => item.id));
    for (const key of invalidEpisodes.current) {
      if (!visible.has(key.split(":")[1])) invalidEpisodes.current.delete(key);
    }
    setTouched((previous) => new Set([...previous].filter((id) => visible.has(id))));
    setUploadErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([id]) => visible.has(id))));
    onChange({ answers: active });
  }

  function goTo(target: string, backtrack = false) {
    if (backtrack) log?.("backtrack", target);
    log?.(target === sectionReview ? "review" : "section", target);
    setConfirmError(false);
    if (target !== sectionReview) setConfirmed(false);
    onChange({ section: target });
    requestAnimationFrame(() => {
      const heading = document.getElementById(target === sectionReview ? "review-heading" : `section-${target}-heading`);
      heading?.focus();
    });
  }

  function validate(fields: Field[]) {
    const invalid = fields.filter((field) => validateField(field, answers, lang));
    if (!invalid.length) return true;
    invalid.forEach((field) => noteInvalid("validation-error", field.id));
    setTouched((previous) => new Set([...previous, ...invalid.map((field) => field.id)]));
    requestAnimationFrame(() => {
      focusingError.current = true;
      document.getElementById(`field-${invalid[0].id}`)?.focus();
      focusingError.current = false;
    });
    return false;
  }

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reviewing) {
      if (!confirmed) {
        setConfirmError(true);
        document.getElementById("confirm-request")?.focus();
        return;
      }
      const mismatches = checkScenario?.(answers) ?? [];
      if (mismatches.length) {
        mismatches.forEach((id) => noteInvalid("scenario-error", id));
        setScenarioErrors(mismatches);
        requestAnimationFrame(() => document.getElementById("scenario-errors")?.focus());
        return;
      }
      onSubmit(activeAnswers(workflow, answers));
      return;
    }
    const fields = (guided && current ? [current] : sections).flatMap((item) => visibleFields(item, answers));
    if (!validate(fields)) return;
    const next = guided ? sections[step + 1]?.id : undefined;
    goTo(next ?? sectionReview);
  }

  function chooseMode(value: Mode) {
    if (value !== mode) onChange({ mode: value, section: sections[0].id });
  }

  return <>
    <header className="form-heading">
      <div><h1>{workflow.title[lang]}</h1><p>{workflow.description[lang]}</p></div>
      <div className={`save-status ${saveStatus}`} role="status"><CloudCheck size={17} aria-hidden />
        {saveStatus === "saved" ? t("Saved on this device", "इस डिवाइस पर सहेजा गया") : saveStatus === "saving" ? t("Saving draft…", "मसौदा सहेजा जा रहा है…") : t("Draft could not be saved", "मसौदा सहेजा नहीं जा सका")}
      </div>
    </header>
    {!log && <div className="mode-row"><div className="segmented" role="group" aria-label={t("Form layout", "फ़ॉर्म लेआउट")}>
      <button type="button" aria-pressed={guided} onClick={() => chooseMode("guided")}><PanelsTopLeft size={17} aria-hidden />{modeLabel.guided[lang]}</button>
      <button type="button" aria-pressed={!guided} onClick={() => chooseMode("single")}><List size={18} aria-hidden />{modeLabel.single[lang]}</button>
    </div></div>}
    <div className="editor-layout">
      <aside className="step-panel" aria-label={t("Form sections", "फ़ॉर्म के अनुभाग")}>
        <div className="step-heading">{t("Application progress", "आवेदन की प्रगति")}</div>
        <ol>{[...sections.map((item) => ({ id: item.id, title: item.title[lang] })), { id: sectionReview, title: reviewTitle[lang] }].map((item, position) => {
          const selected = step === position;
          const completed = (guided || reviewing) && position < step;
          return <li key={item.id}>
            <button type="button" aria-current={selected ? "step" : undefined} disabled={guided ? position >= step : position === sections.length || selected}
              onClick={() => goTo(item.id, position < step)}><span className="step-number">{completed ? <Check size={14} aria-hidden /> : position + 1}</span>{item.title}</button>
          </li>;
        })}</ol>
      </aside>
      <form className="editor-card" onSubmit={advance} noValidate>
        {reviewing ? <>
          <h2 id="review-heading" tabIndex={-1}>{reviewTitle[lang]}</h2>
          <p className="section-intro">{t("Check your information before submitting.", "सबमिट करने से पहले जानकारी जाँचें।")}</p>
          {scenarioErrors.length > 0 && <div className="error-box" id="scenario-errors" tabIndex={-1} role="alert"><CircleAlert size={19} aria-hidden />
            <span>{t("These fields differ from the study case", "ये फ़ील्ड अध्ययन के उदाहरण से अलग हैं")}<ul>{scenarioErrors.map((id) => <li key={id}>{workflow.sections.flatMap((item) => item.fields).find((field) => field.id === id)?.label[lang]}</li>)}</ul></span>
          </div>}
          <AnswerSummary workflow={workflow} answers={answers} lang={lang} onEdit={(target) => goTo(target, true)} />
          <label className="check-label" htmlFor="confirm-request"><input id="confirm-request" type="checkbox" checked={confirmed} required aria-invalid={confirmError || undefined} aria-describedby={confirmError ? "confirm-error" : undefined} onChange={(event) => { setConfirmed(event.target.checked); setConfirmError(false); }} />{t("I have reviewed the information in this request.", "मैंने इस अनुरोध की जानकारी की समीक्षा कर ली है।")}</label>
          {confirmError && <p id="confirm-error" className="field-error" role="alert">{t("Confirm that you reviewed this request.", "पुष्टि करें कि आपने अनुरोध की समीक्षा की है।")}</p>}
        </> : (guided && current ? [current] : sections).map((item, position) => <section className="editor-section" key={item.id} onFocusCapture={(event) => {
          if (guided || focusingError.current || !event.target.id.startsWith("field-") || item.id === section) return;
          if (position < step) log?.("backtrack", item.id);
          log?.("section", item.id);
          onChange({ section: item.id });
        }}>
          <h2 id={`section-${item.id}-heading`} tabIndex={-1}>{item.title[lang]}</h2>
          <p className="section-intro">{item.description[lang]}</p>
          <div className="fields">
            {visibleFields(item, answers).map((field) => {
              const value = answers[field.id];
              const error = uploadErrors[field.id] || (touched.has(field.id) ? validateField(field, answers, lang) : undefined);
              const id = `field-${field.id}`;
              const wide = field.kind === "file" || field.kind === "textarea";
              const props = {
                id, name: field.id, required: field.required && !isAttachment(value),
                "aria-invalid": Boolean(error) || undefined,
                "aria-describedby": [field.help ? `${id}-help` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined,
              };
              const textValue = typeof value === "string" ? value : "";
              return <div className={`field${wide ? " wide" : ""}`} key={field.id}>
                <label htmlFor={id}>{field.label[lang]} {field.required ? <span className="required" aria-hidden>*</span> : <small>{t("Optional", "वैकल्पिक")}</small>}</label>
                {field.kind === "file" ? <>
                  {isAttachment(value) && <div className="attached"><FileText size={19} aria-hidden /><div><strong>{value.file.name}</strong><small>{t("Attached", "संलग्न")} · {Math.max(1, Math.round(value.file.size / 1024))} KB</small></div>
                    <button className="icon-button" type="button" onClick={() => changeValue(field, undefined)} aria-label={`${t("Remove", "हटाएँ")} ${field.label[lang]}`}><X size={17} aria-hidden /></button>
                  </div>}
                  <div className={`upload-box${isAttachment(value) ? " replace" : ""}`}><Upload size={19} aria-hidden />
                    <span><strong>{isAttachment(value) ? t("Replace file", "फ़ाइल बदलें") : t("Choose file", "फ़ाइल चुनें")}</strong><small>{t("PDF, PNG or JPG · up to 5 MB", "PDF, PNG या JPG · 5 MB तक")}</small></span>
                    <input type="file" {...props} accept={attachmentAccept} onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) { changeValue(field, { file, attachedAt: Date.now() }); event.target.value = ""; }
                    }} />
                  </div>
                </> : field.kind === "choice" ? <div className="select-wrap"><select {...props} value={textValue} onBlur={() => touch(field)} onChange={(event) => changeValue(field, event.target.value)}>
                  <option value="">{t("Select an option", "एक विकल्प चुनें")}</option>
                  {field.options?.map((item) => <option value={item.value} key={item.value}>{item.label[lang]}</option>)}
                </select><ChevronDown size={17} aria-hidden /></div> : field.kind === "textarea" ?
                  <textarea {...props} placeholder={field.placeholder?.[lang]} value={textValue} rows={4} maxLength={field.maxLength} onBlur={() => touch(field)} onChange={(event) => changeValue(field, event.target.value)} /> :
                  <input {...props} type={field.kind === "number" ? "text" : field.kind} inputMode={field.kind === "number" ? "decimal" : undefined}
                    autoComplete={log ? "off" : field.id === "name" ? "name" : field.kind === "email" ? "email" : undefined}
                    placeholder={field.placeholder?.[lang]} maxLength={field.maxLength} value={textValue}
                    onBlur={() => touch(field)} onChange={(event) => changeValue(field, event.target.value)} />
                }
                {field.help && <small className="field-help" id={`${id}-help`}>{field.help[lang]}</small>}
                {error && <p className="field-error" id={`${id}-error`} role="alert">{error}</p>}
              </div>;
            })}
          </div>
        </section>)}
        <div className="editor-actions">
          {(reviewing || (guided && step > 0)) ? <button className="button secondary" type="button" onClick={() => goTo(reviewing && !guided ? sections[0].id : sections[step - 1].id, true)}><ArrowLeft size={17} aria-hidden /> {t("Back", "पीछे")}</button> : <span />}
          <button className="button primary" type="submit">{reviewing ? t("Submit request", "अनुरोध सबमिट करें") : !guided || step === sections.length - 1 ? t("Review application", "आवेदन की समीक्षा करें") : t("Continue", "जारी रखें")} {reviewing ? <Check size={17} aria-hidden /> : <ArrowRight size={17} aria-hidden />}</button>
        </div>
      </form>
    </div>
  </>;
}
