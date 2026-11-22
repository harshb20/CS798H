export type Language = "en" | "hi";
export type Text = Record<Language, string>;
export const copy = (en: string, hi: string): Text => ({ en, hi });

export type WorkflowId = "scholarship" | "reimbursement" | "academic";
export type Mode = "guided" | "single";
export type Attachment = { file: File; attachedAt: number };
export type Value = string | Attachment;
export type Answers = Record<string, Value>;
type Rule = { field: string; equals: string };
type Option = { value: string; label: Text };
export type Field = {
  id: string;
  label: Text;
  kind: "text" | "email" | "number" | "date" | "choice" | "textarea" | "file";
  required?: boolean;
  help?: Text;
  placeholder?: Text;
  options?: Option[];
  when?: Rule;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: RegExp;
};
export type Section = { id: string; title: Text; description: Text; fields: Field[] };
export type Workflow = {
  id: WorkflowId;
  category: Text;
  title: Text;
  description: Text;
  minutes: number;
  sections: Section[];
};
export type Draft = {
  id: string;
  workflow: WorkflowId;
  mode: Mode;
  answers: Answers;
  section: string;
  updatedAt: number;
};
export type Submission = {
  id: string;
  workflow: WorkflowId;
  mode: Mode;
  answers: Answers;
  submittedAt: number;
};

export const sectionReview = "review";
export const maxAttachmentSize = 5 * 1024 * 1024;
export const attachmentAccept = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

const option = (value: string, en: string, hi: string): Option => ({ value, label: copy(en, hi) });
const file = (id: string, label: Text, when?: Rule, required = true): Field => ({
  id, label, kind: "file", required, when,
});
const person: Section = {
  id: "personal",
  title: copy("Applicant details", "आवेदक का विवरण"),
  description: copy("Tell us who is making this request.", "बताएँ कि यह अनुरोध कौन कर रहा है।"),
  fields: [
    { id: "name", kind: "text", label: copy("Full name", "पूरा नाम"), placeholder: copy("e.g. Aditi Verma", "जैसे अदिति वर्मा"), required: true, maxLength: 100 },
    { id: "roll", kind: "text", label: copy("Roll number", "अनुक्रमांक"), placeholder: copy("e.g. 240138", "जैसे 240138"), required: true, pattern: /^[a-z0-9-]{4,16}$/i, help: copy("4–16 letters, numbers or hyphens.", "4–16 अक्षर, अंक या हाइफ़न।") },
    { id: "email", kind: "email", label: copy("Institute email", "संस्थान का ईमेल"), placeholder: copy("you@iitk.ac.in", "you@iitk.ac.in"), required: true, maxLength: 254 },
  ],
};
const documents = (fields: Field[]): Section => ({
  id: "documents",
  title: copy("Supporting documents", "सहायक दस्तावेज़"),
  description: copy("Attach the documents required for your request.", "अपने अनुरोध के लिए आवश्यक दस्तावेज़ जोड़ें।"),
  fields,
});

export const workflows: Record<WorkflowId, Workflow> = {
  scholarship: {
    id: "scholarship",
    category: copy("Financial aid", "आर्थिक सहायता"),
    title: copy("Scholarship application", "छात्रवृत्ति आवेदन"),
    description: copy("Apply for merit-based or need-based financial support.", "योग्यता या आर्थिक आवश्यकता के आधार पर सहायता के लिए आवेदन करें।"),
    minutes: 8,
    sections: [
      person,
      {
        id: "details",
        title: copy("Scholarship details", "छात्रवृत्ति का विवरण"),
        description: copy("Choose a scholarship type to see its requirements.", "आवश्यकताएँ देखने के लिए छात्रवृत्ति का प्रकार चुनें।"),
        fields: [
          { id: "scheme", kind: "choice", label: copy("Scholarship type", "छात्रवृत्ति का प्रकार"), required: true, options: [option("merit", "Merit-based", "योग्यता आधारित"), option("need", "Need-based", "आवश्यकता आधारित")] },
          { id: "cpi", kind: "number", label: copy("Cumulative performance index (CPI)", "संचयी प्रदर्शन सूचकांक (CPI)"), required: true, min: 0, max: 10, when: { field: "scheme", equals: "merit" } },
          { id: "income", kind: "number", label: copy("Annual household income (₹)", "वार्षिक पारिवारिक आय (₹)"), required: true, min: 0, max: 100000000, when: { field: "scheme", equals: "need" } },
          { id: "statement", kind: "textarea", label: copy("Statement of purpose", "उद्देश्य का विवरण"), required: true, maxLength: 900, placeholder: copy("Briefly explain why you are applying.", "संक्षेप में बताएँ कि आप आवेदन क्यों कर रहे हैं।") },
        ],
      },
      documents([
        file("transcript", copy("Academic transcript", "शैक्षणिक अंकपत्र"), { field: "scheme", equals: "merit" }),
        file("incomeProof", copy("Household income certificate", "पारिवारिक आय प्रमाणपत्र"), { field: "scheme", equals: "need" }),
        file("studentCard", copy("Student ID card", "छात्र पहचान पत्र")),
      ]),
    ],
  },
  reimbursement: {
    id: "reimbursement",
    category: copy("Expenses", "व्यय"),
    title: copy("Expense reimbursement", "व्यय प्रतिपूर्ति"),
    description: copy("Claim eligible travel, conference or project expenses.", "यात्रा, सम्मेलन या परियोजना के पात्र खर्चों का दावा करें।"),
    minutes: 6,
    sections: [
      person,
      {
        id: "details",
        title: copy("Expense details", "व्यय का विवरण"),
        description: copy("Enter the expense category, date and amount paid.", "व्यय की श्रेणी, तारीख और भुगतान की गई राशि भरें।"),
        fields: [
          { id: "category", kind: "choice", label: copy("Expense category", "व्यय श्रेणी"), required: true, options: [option("travel", "Travel", "यात्रा"), option("conference", "Conference", "सम्मेलन"), option("project", "Project", "परियोजना")] },
          { id: "amount", kind: "number", label: copy("Amount paid (₹)", "भुगतान राशि (₹)"), required: true, min: 0.01, max: 1000000 },
          { id: "expenseDate", kind: "date", label: copy("Payment date", "भुगतान की तारीख"), required: true },
          { id: "route", kind: "text", label: copy("Travel route", "यात्रा मार्ग"), required: true, maxLength: 120, when: { field: "category", equals: "travel" } },
          { id: "conference", kind: "text", label: copy("Conference name", "सम्मेलन का नाम"), required: true, maxLength: 120, when: { field: "category", equals: "conference" } },
          { id: "project", kind: "text", label: copy("Project reference", "परियोजना संदर्भ"), required: true, maxLength: 120, when: { field: "category", equals: "project" } },
        ],
      },
      documents([
        file("receipt", copy("Payment receipt", "भुगतान रसीद")),
        file("ticket", copy("Travel ticket", "यात्रा टिकट"), { field: "category", equals: "travel" }),
        file("registration", copy("Registration confirmation", "पंजीकरण पुष्टि"), { field: "category", equals: "conference" }),
      ]),
    ],
  },
  academic: {
    id: "academic",
    category: copy("Academics", "शैक्षणिक"),
    title: copy("Academic request", "शैक्षणिक अनुरोध"),
    description: copy("Request academic leave, a document or a course change.", "शैक्षणिक अवकाश, दस्तावेज़ या पाठ्यक्रम परिवर्तन का अनुरोध करें।"),
    minutes: 5,
    sections: [
      person,
      {
        id: "details",
        title: copy("Request details", "अनुरोध का विवरण"),
        description: copy("Select the request that fits your situation.", "अपनी परिस्थिति के अनुसार अनुरोध चुनें।"),
        fields: [
          { id: "request", kind: "choice", label: copy("Request type", "अनुरोध का प्रकार"), required: true, options: [option("leave", "Academic leave", "शैक्षणिक अवकाश"), option("certificate", "Certificate", "प्रमाणपत्र"), option("course", "Course change", "पाठ्यक्रम परिवर्तन")] },
          { id: "startDate", kind: "date", label: copy("Leave start date", "अवकाश शुरू होने की तारीख"), required: true, when: { field: "request", equals: "leave" } },
          { id: "endDate", kind: "date", label: copy("Leave end date", "अवकाश समाप्त होने की तारीख"), required: true, when: { field: "request", equals: "leave" } },
          { id: "certificate", kind: "text", label: copy("Certificate name", "प्रमाणपत्र का नाम"), required: true, maxLength: 100, when: { field: "request", equals: "certificate" } },
          { id: "course", kind: "text", label: copy("Course code", "पाठ्यक्रम कोड"), required: true, maxLength: 16, when: { field: "request", equals: "course" } },
          { id: "reason", kind: "textarea", label: copy("Reason for request", "अनुरोध का कारण"), required: true, maxLength: 900 },
        ],
      },
      documents([
        file("leaveProof", copy("Supporting evidence for leave", "अवकाश के लिए सहायक प्रमाण"), { field: "request", equals: "leave" }),
        file("approval", copy("Instructor approval", "शिक्षक की स्वीकृति"), { field: "request", equals: "course" }),
        file("support", copy("Additional document", "अतिरिक्त दस्तावेज़"), undefined, false),
      ]),
    ],
  },
};

export const isAttachment = (value?: Value): value is Attachment => typeof value === "object" && value !== null;

export function visibleFields(section: Section, answers: Answers) {
  return section.fields.filter((field) => !field.when || answers[field.when.field] === field.when.equals);
}

export function activeAnswers(workflow: Workflow, answers: Answers): Answers {
  return Object.fromEntries(workflow.sections.flatMap((section) => visibleFields(section, answers))
    .filter((field) => answers[field.id] !== undefined && answers[field.id] !== "")
    .map((field) => [field.id, answers[field.id]]));
}

export function validateField(field: Field, answers: Answers, lang: Language): string | undefined {
  const value = answers[field.id];
  const stringValue = typeof value === "string" ? value.trim() : "";
  const message = (en: string, hi: string) => copy(en, hi)[lang];
  if (field.kind === "file") {
    if (!isAttachment(value)) return field.required ? message("Attach this document.", "यह दस्तावेज़ जोड़ें।") : undefined;
    if (!/\.(pdf|png|jpe?g)$/i.test(value.file.name)) return message("Choose a PDF, PNG or JPG file.", "PDF, PNG या JPG फ़ाइल चुनें।");
    if (value.file.size === 0 || value.file.size > maxAttachmentSize) return message("Choose a non-empty file up to 5 MB.", "5 MB तक की गैर-खाली फ़ाइल चुनें।");
    return;
  }
  if (!stringValue) return field.required ? message("This field is required.", "यह फ़ील्ड आवश्यक है।") : undefined;
  if (field.kind === "email" && !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(stringValue)) return message("Enter a valid email address.", "मान्य ईमेल पता भरें।");
  if (field.kind === "choice" && !field.options?.some((item) => item.value === stringValue)) return message("Choose an option.", "एक विकल्प चुनें।");
  if (field.pattern && !field.pattern.test(stringValue)) return field.help?.[lang] ?? message("Check the format.", "प्रारूप जाँचें।");
  if (field.maxLength && stringValue.length > field.maxLength) return message(`Use at most ${field.maxLength} characters.`, `अधिकतम ${field.maxLength} अक्षर लिखें।`);
  if (field.kind === "number") {
    const number = Number(stringValue);
    if (!Number.isFinite(number) || number < (field.min ?? -Infinity) || number > (field.max ?? Infinity)) {
      return message(`Enter a value from ${field.min} to ${field.max}.`, `${field.min} से ${field.max} तक का मान भरें।`);
    }
  }
  if (field.kind === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(stringValue) || !Number.isFinite(Date.parse(stringValue)) || new Date(stringValue).toISOString().slice(0, 10) !== stringValue)) return message("Enter a valid date.", "मान्य तारीख भरें।");
  if (field.id === "endDate" && typeof answers.startDate === "string" && stringValue < answers.startDate) {
    return message("Use a date on or after the start date.", "आरंभ की तारीख या उसके बाद की तारीख चुनें।");
  }
}

export function displayValue(field: Field, value: Value | undefined, lang: Language) {
  if (isAttachment(value)) return value.file.name;
  return field.options?.find((option) => option.value === value)?.label[lang] ?? value?.trim() ?? "—";
}
