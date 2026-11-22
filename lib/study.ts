import { copy, isAttachment, type Answers, type Mode } from "./forms";

export const scenarios = {
  A: {
    name: "Anika Rao", roll: "240138", email: "anika@example.test", scheme: "merit", cpi: "8.6",
    statement: "I am applying for support for my final-year research project.",
    transcript: "anika-transcript.pdf", studentCard: "anika-student-id.pdf",
  },
  B: {
    name: "Kabir Sen", roll: "240259", email: "kabir@example.test", scheme: "need", income: "240000",
    statement: "I am applying for support for my tuition and course materials.",
    incomeProof: "kabir-income.pdf", studentCard: "kabir-student-id.pdf",
  },
} as const;

export type Scenario = keyof typeof scenarios;
export const scenarioFields = {
  name: copy("Full name", "पूरा नाम"),
  roll: copy("Roll number", "अनुक्रमांक"),
  email: copy("Institute email", "संस्थान का ईमेल"),
  scheme: copy("Scholarship type", "छात्रवृत्ति का प्रकार"),
  cpi: copy("CPI", "CPI"),
  income: copy("Annual household income (₹)", "वार्षिक पारिवारिक आय (₹)"),
  statement: copy("Statement of purpose", "उद्देश्य का विवरण"),
  transcript: copy("Academic transcript", "शैक्षणिक अंकपत्र"),
  incomeProof: copy("Household income certificate", "पारिवारिक आय प्रमाणपत्र"),
  studentCard: copy("Student ID card", "छात्र पहचान पत्र"),
};

export type StudyEvent = {
  type: "start" | "validation-error" | "scenario-error" | "backtrack" | "section" | "review" | "submit" | "survey";
  target?: string;
  ms: number;
};

type Condition = {
  mode: Mode;
  scenario: Scenario;
  startedAt?: number;
  completedAt?: number;
  answers: Answers;
  section: string;
  events: StudyEvent[];
  sus?: number[];
  tlx?: number[];
};

export type Session = {
  id: string;
  sequence: number;
  createdAt: number;
  endedAt?: number;
  conditions: Condition[];
};

export function createSession(sequence: number, id = crypto.randomUUID(), createdAt = Date.now()): Session {
  const guidedFirst = sequence % 2 === 0;
  const caseAFirst = sequence % 4 < 2;
  return {
    id,
    sequence: sequence % 4,
    createdAt,
    conditions: [
      { mode: guidedFirst ? "guided" : "single", scenario: caseAFirst ? "A" : "B", answers: {}, section: "personal", events: [] },
      { mode: guidedFirst ? "single" : "guided", scenario: caseAFirst ? "B" : "A", answers: {}, section: "personal", events: [] },
    ],
  };
}

export function mismatchFields(scenario: Scenario, answers: Answers) {
  return Object.entries(scenarios[scenario]).flatMap(([field, expected]) => {
    const value = answers[field];
    if (expected.endsWith(".pdf")) return isAttachment(value) && value.file.name === expected ? [] : [field];
    if (field === "cpi" || field === "income") return typeof value === "string" && Number(value) === Number(expected) ? [] : [field];
    return typeof value === "string" && value.trim() === expected ? [] : [field];
  });
}

export const susItems = [
  copy("I think that I would like to use this system frequently.", "मुझे लगता है कि मैं इस प्रणाली का अक्सर उपयोग करना चाहूँगा/चाहूँगी।"),
  copy("I found the system unnecessarily complex.", "मुझे यह प्रणाली बेवजह जटिल लगी।"),
  copy("I thought the system was easy to use.", "मुझे लगा कि इस प्रणाली का उपयोग आसान था।"),
  copy("I think that I would need the support of a technical person to be able to use this system.", "मुझे लगता है कि इस प्रणाली के उपयोग के लिए मुझे किसी तकनीकी व्यक्ति की मदद चाहिए होगी।"),
  copy("I found the various functions in this system were well integrated.", "मुझे लगा कि इस प्रणाली के अलग-अलग कार्य अच्छी तरह जुड़े हुए थे।"),
  copy("I thought there was too much inconsistency in this system.", "मुझे लगा कि इस प्रणाली में बहुत अधिक असंगति थी।"),
  copy("I would imagine that most people would learn to use this system very quickly.", "मुझे लगता है कि अधिकतर लोग इस प्रणाली का उपयोग बहुत जल्दी सीख लेंगे।"),
  copy("I found the system very cumbersome to use.", "मुझे इस प्रणाली का उपयोग बहुत झंझट भरा लगा।"),
  copy("I felt very confident using the system.", "इस प्रणाली का उपयोग करते समय मुझे बहुत आत्मविश्वास महसूस हुआ।"),
  copy("I needed to learn a lot of things before I could get going with this system.", "इस प्रणाली का उपयोग शुरू करने से पहले मुझे बहुत कुछ सीखना पड़ा।"),
];

export const tlxItems = [
  copy("Mental demand", "मानसिक माँग"),
  copy("Physical demand", "शारीरिक माँग"),
  copy("Temporal demand", "समय का दबाव"),
  copy("Performance", "प्रदर्शन"),
  copy("Effort", "प्रयास"),
  copy("Frustration", "हताशा"),
];

export function scoreSus(answers: number[]) {
  return answers.reduce((sum, value, index) => sum + (index % 2 ? 5 - value : value - 1), 0) * 2.5;
}

export function scoreTlx(answers: number[]) {
  return answers.reduce((sum, value) => sum + value, 0) / answers.length;
}

export function studyRows(sessions: Session[]) {
  return sessions.flatMap((session) => session.conditions.flatMap((task, position) => {
    if (!task.startedAt) return [];
    return [{
      participant: session.id,
      sequence: session.sequence,
      position: position + 1,
      mode: task.mode,
      scenario: task.scenario,
      completed: Boolean(task.completedAt),
      session_ended_early: Boolean(session.endedAt),
      time_seconds: task.completedAt ? (task.completedAt - task.startedAt) / 1000 : null,
      input_errors: task.events.filter((event) => event.type === "validation-error" || event.type === "scenario-error").length,
      backtracks: task.events.filter((event) => event.type === "backtrack").length,
      sus: task.sus ? scoreSus(task.sus) : null,
      raw_tlx: task.tlx ? scoreTlx(task.tlx) : null,
      sus_responses: task.sus ?? null,
      tlx_responses: task.tlx ?? null,
      events: task.events,
    }];
  }));
}

export function studyCsv(sessions: Session[]) {
  const keys = ["participant", "sequence", "position", "mode", "scenario", "completed", "session_ended_early", "time_seconds", "input_errors", "backtracks", "sus", "raw_tlx"] as const;
  return [keys.join(","), ...studyRows(sessions).map((row) => keys.map((key) => row[key] ?? "").join(","))].join("\r\n");
}
