import { ArrowDownToLine, ArrowRight, Check, Clock3, FileCheck2, FileText, FlaskConical, GraduationCap, Layers2, NotebookPen, ReceiptText } from "lucide-react";
import { copy, displayValue, isAttachment, visibleFields, type Answers, type Language, type Mode, type Workflow, type WorkflowId } from "../lib/forms";
import { downloadFile } from "../lib/storage";

export const workflowIcons = { scholarship: GraduationCap, reimbursement: ReceiptText, academic: NotebookPen };
export const modeLabel = {
  guided: copy("Guided form", "चरणबद्ध फ़ॉर्म"),
  single: copy("Single-page form", "एक-पृष्ठ फ़ॉर्म"),
};
export const reviewTitle = copy("Review & submit", "समीक्षा और सबमिट");

export function Brand({ lang }: { lang: Language }) {
  return <a className="brand" href="#overview" aria-label="FormFlow">
    <span className="brand-mark"><Layers2 size={22} strokeWidth={2.4} aria-hidden /></span>
    <span><strong>FormFlow<span>.</span></strong><small>{copy("Campus services", "कैंपस सेवाएँ")[lang]}</small></span>
  </a>;
}

export function WorkflowIcon({ id, small = false }: { id: WorkflowId; small?: boolean }) {
  const Icon = workflowIcons[id];
  return <span className={`workflow-icon ${id}${small ? " small" : ""}`}><Icon size={small ? 19 : 25} strokeWidth={1.8} aria-hidden /></span>;
}

export function WorkflowCard({ workflow, lang, draft }: { workflow: Workflow; lang: Language; draft: boolean }) {
  return <a className="workflow-card" href={`#forms/${workflow.id}`}>
    <div className="card-top"><WorkflowIcon id={workflow.id} /><span className="category">{workflow.category[lang]}</span></div>
    <h3>{workflow.title[lang]}</h3>
    <p>{workflow.description[lang]}</p>
    <div className="card-bottom"><span><Clock3 size={15} aria-hidden /> {workflow.minutes} {copy("min", "मिनट")[lang]}</span><strong>{draft ? copy("Resume draft", "मसौदा जारी रखें")[lang] : copy("Open form", "फ़ॉर्म खोलें")[lang]} <ArrowRight size={17} aria-hidden /></strong></div>
  </a>;
}

export function HeroArt() {
  return <div className="hero-art" aria-hidden="true">
    <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
    <div className="diagram-line line-top" /><div className="diagram-line line-bottom" />
    <span className="diagram-dot dot-top" /><span className="diagram-dot dot-bottom" /><span className="diagram-dot dot-right" />
    <div className="diagram-tile tile-doc"><span className="diagram-icon"><FileText size={22} /></span><i /><i /><i /></div>
    <div className="diagram-tile tile-check"><span className="diagram-icon"><Check size={19} strokeWidth={2.6} /></span><div><i /><i /></div></div>
    <div className="diagram-tile tile-layer"><Layers2 size={24} strokeWidth={1.7} /></div>
  </div>;
}

export function Empty({ lang, kind }: { lang: Language; kind: "applications" | "study" }) {
  const Icon = kind === "study" ? FlaskConical : FileCheck2;
  const title = kind === "study" ? copy("No study data yet", "अभी अध्ययन डेटा नहीं है") : copy("Your activity will appear here", "आपकी गतिविधि यहाँ दिखेगी");
  const body = kind === "study" ? copy("Start a session to record your first comparison.", "पहली तुलना दर्ज करने के लिए सत्र शुरू करें।") : copy("Open a form to create a draft, or return here to review a submitted request.", "मसौदा बनाने के लिए फ़ॉर्म खोलें। सबमिट किया गया अनुरोध यहाँ देख सकते हैं।");
  return <div className="empty"><span className="empty-icon"><Icon size={22} aria-hidden /></span><div><strong>{title[lang]}</strong><p>{body[lang]}</p></div></div>;
}

export function AnswerSummary({ workflow, answers, lang, onEdit }: {
  workflow: Workflow; answers: Answers; lang: Language; onEdit?: (section: string) => void;
}) {
  return <div className="summary-groups">
    {workflow.sections.map((section) => {
      const fields = visibleFields(section, answers);
      if (!fields.length) return null;
      return <section className="summary-group" key={section.id}>
        <div className="summary-heading"><h3>{section.title[lang]}</h3>
          {onEdit && <button className="text-button" type="button" onClick={() => onEdit(section.id)} aria-label={`${copy("Edit", "संपादित करें")[lang]} ${section.title[lang]}`}>{copy("Edit", "संपादित करें")[lang]}</button>}
        </div>
        <dl>{fields.map((field) => {
          const value = answers[field.id];
          return <div key={field.id}><dt>{field.label[lang]}</dt><dd>
            {isAttachment(value) && <FileText size={15} aria-hidden />}
            {displayValue(field, value, lang)}
            {isAttachment(value) && !onEdit && <button className="icon-button attachment-download" type="button" aria-label={`${copy("Download", "डाउनलोड करें")[lang]} ${value.file.name}`} onClick={() => downloadFile(value.file.name, value.file)}><ArrowDownToLine size={16} aria-hidden /></button>}
          </dd></div>;
        })}</dl>
      </section>;
    })}
  </div>;
}

export function formatDate(timestamp: number, lang: Language) {
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium" }).format(timestamp);
}
