# FormFlow

FormFlow is a CS798H project for building and studying campus administrative forms. A reusable Next.js and TypeScript engine renders scholarship, expense reimbursement, and academic requests as guided or single-page forms. Both layouts share conditional rules, validation, and submission review.

## Run locally

Use Node.js 20.9 or later.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Run `npm run typecheck` to check types and `npm run build` to verify the production bundle. Use `npm start` to serve that bundle.

## What the app does

- The **Form catalog** opens one draft per workflow. Switch layouts on a draft to see the same answers in either presentation. Changing a branching answer removes answers and files from branches that no longer apply.
- Drafts autosave in IndexedDB, including attached PDFs, PNGs, and JPEGs up to 5 MB per file. The interface supports English and Hindi, keyboard navigation, and field-level error messages.
- **My applications** lists drafts and submitted receipts. Open a receipt and choose **Export PDF**, then select the browser’s **Save as PDF** destination. The PDF includes the rendered answers and document names. The receipt provides a separate download for each attached file.
- FormFlow is a browser-local prototype. Submitting creates a receipt in the current browser. There is no institutional service or account backend. Study results can be shared via their dedicated exports.

Add or modify workflows in [lib/forms.ts](lib/forms.ts). A workflow defines sections, fields, bilingual text, and equality conditions on earlier answers. The schema drives rendering, validation, and the review summary.

## Run a comparative usability study

Open **Usability study**, give consent, and start a session. Each participant completes one guided application and one single-page application using two fictional scholarship cases. Download the fixture documents before beginning each timed task. The app checks that a submission matches its case before it counts as complete. Each task ends with the 10-item System Usability Scale and the six dimensions of the unweighted NASA Task Load Index.

Sessions on the same browser profile cycle through these four sequences. Keep the same language, device class, and moderator instructions across sessions where possible. For sessions spread across browser profiles, assign a sequence explicitly by opening `/#study/sequence-0` through `/#study/sequence-3` before starting. Use **End session** to preserve partial research data and make room for the next participant.

| Sequence | Task 1 | Task 2 |
| --- | --- | --- |
| 0 | Guided · case A | Single-page · case B |
| 1 | Single-page · case A | Guided · case B |
| 2 | Guided · case B | Single-page · case A |
| 3 | Single-page · case B | Guided · case A |

| Measure | Operational definition |
| --- | --- |
| Completion time | Wall-clock seconds from **Begin task** to correct submission, including time away from the page. Incomplete tasks have a blank completion time. |
| Input errors | Displayed invalid episodes per field plus case-mismatch episodes at submission. An unchanged error is counted once until the field is corrected or, for a case mismatch, edited. |
| Backtracks | Explicit navigation to an earlier section, returning from review to edit, or returning keyboard/pointer focus to an earlier section of the single-page form. Scrolling alone does not count. |
| SUS | Sum of odd-item contributions `rating − 1` and even-item contributions `5 − rating`, multiplied by 2.5. Higher scores indicate greater perceived usability. |
| Raw NASA-TLX | Mean of the six 0–100 ratings. Higher scores indicate higher perceived workload. On the performance dimension, 0 means successful and 100 means unsuccessful. |

The dashboard reports means across complete participant pairs on the current profile. The CSV contains one row per started condition, including incomplete conditions. The JSON adds raw questionnaire responses and timestamped field or navigation events. Study exports omit application answers and document contents. Exports from different profiles can be joined by concatenating their rows and grouped by the random participant identifier.

The Hindi questionnaire text is a project translation. For formal reporting, specify the language used, account for case and order effects, and analyze within-participant differences. The repository includes the study instrument and fictional tasks. Participant recruitment and human results are outside the implementation.

### Instruments

- John Brooke, *SUS: A Quick and Dirty Usability Scale*. [Original questionnaire and scoring](https://digital.ahrq.gov/sites/default/files/docs/survey/systemusabilityscale%2528sus%2529_comp%255B1%255D.pdf)
- NASA, *Task Load Index*. [Six workload dimensions](https://www.nasa.gov/human-systems-integration-division/nasa-task-load-index-tlx/)
- Office of the Director, Operational Test and Evaluation, *Repository of Validated Scales for Human Factors Evaluation*, §4.3. [Raw TLX scoring](https://www.dote.osd.mil/Portals/97/pub/memos/Repository%20of%20Validated%20Scales%20for%20Human%20Factors%20Evaluation_WithCover.pdf)
