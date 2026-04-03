import { useEffect, useRef, useState } from "react";

type WorkflowDiagramSectionProps = {
  carsMode: boolean;
  showAdvancedToolsNote?: boolean;
  indexerGithubUrl?: string;
};

type WorkflowStep = {
  id: number;
  title: string;
  summary: string;
  badge: string;
  snippet?: string;
  cool: string;
  otherwise: string;
};

type WorkflowExample = {
  title: string;
  detail: string;
};

type WorkflowJsonGuide = {
  human: string;
  detail: string;
  machine: string;
};

export default function WorkflowDiagramSection({
  carsMode,
  showAdvancedToolsNote = true,
  indexerGithubUrl,
}: WorkflowDiagramSectionProps) {
  const previewSectionRef = useRef<HTMLElement | null>(null);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const previewImagePath = "/images/published-data-preview.png";
  const previewImageAlt =
    "Example of how published structured data can look in the viewer interface.";

  const firstStepSnippet = carsMode
    ? '{"recordType":"maintenance_event","assetId":"A-102","status":"verified"}'
    : '{"recordType":"invoice","subjectId":"C-88","status":"approved"}';

  const workflowSteps: WorkflowStep[] = [
    {
      id: 1,
      title: "Describe Your Data (Form)",
      badge: "Structured input",
      summary: "Use guided fields to publish clean, consistent structured data.",
      snippet: firstStepSnippet,
      cool: "Consistent structure makes searching, filtering, and automation reliable.",
      otherwise: "Free-form data drifts fast, and every integration needs custom cleanup logic.",
    },
    {
      id: 2,
      title: "Approve and Publish (Wallet Transaction)",
      badge: "Wallet signed",
      summary: "Publish with wallet signature so ownership and intent are cryptographically linked.",
      cool: "Signed transactions create an auditable publishing trail tied to a real account.",
      otherwise: "Without signing, records can be disputed and trust falls back to screenshots or email.",
    },
    {
      id: 3,
      title: "Save a Permanent History (On-Chain Record)",
      badge: "Immutable timeline",
      summary: "Container -> Type -> Item becomes a durable, timestamped record on-chain.",
      cool: "History stays verifiable over time, even when teams or systems change.",
      otherwise: "Centralized logs can be overwritten, backdated, or lost during migrations.",
    },
    {
      id: 4,
      title: "Connect Tools and Automate (API + CLI + Indexer)",
      badge: "Integration layer",
      summary: "Read data through API, automate with CLI, optionally run local indexer from GitHub.",
      cool: "You can move from manual clicking to repeatable scripts and production integrations.",
      otherwise: "Manual copy-paste does not scale and introduces silent operational mistakes.",
    },
    {
      id: 5,
      title: "Use It in Daily Work (Reports, Audits, Verification)",
      badge: "Business value",
      summary: "Use it for reports, audits, automation triggers, and cross-party verification.",
      cool: "One source of truth reduces coordination overhead between owners, clients, and tools.",
      otherwise: "Each party keeps its own version, then spends time reconciling mismatched records.",
    },
  ];

  const alternateExamples: WorkflowExample[] = [
    {
      title: "Maintenance history",
      detail: "Track service events for vehicles, machines, or equipment fleets.",
    },
    {
      title: "Invoices and approvals",
      detail: "Store totals, lifecycle status, and sign-off checkpoints.",
    },
    {
      title: "Compliance and certificates",
      detail: "Record inspections, validity windows, and verification evidence.",
    },
    {
      title: "Supply-chain milestones",
      detail: "Capture handoffs, delivery states, and responsible party changes.",
    },
  ];

  const jsonGuide: WorkflowJsonGuide[] = [
    {
      human: "Who or what this record is about",
      detail: "The main asset, document, or entity reference.",
      machine: '{"subjectId":"A-102","recordType":"inspection"}',
    },
    {
      human: "What happened",
      detail: "Event type, result, and short summary of the action.",
      machine: '{"event":"maintenance_completed","status":"verified","summary":"oil + filter"}',
    },
    {
      human: "When and where",
      detail: "Time context and optional location or environment details.",
      machine: '{"timestamp":"2026-03-31T09:30:00Z","location":"ServiceCenter-03"}',
    },
    {
      human: "Proof or references",
      detail: "Links or IDs for external docs, photos, or source systems.",
      machine: '{"proof":["doc:INV-2291","photo:QmXyz..."],"externalRef":"ERP-8812"}',
    },
  ];

  useEffect(() => {
    const sectionNode = previewSectionRef.current;
    if (!sectionNode || isPreviewReady) return;
    if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
      setIsPreviewReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        const isIntersecting = entries.some((entry) => entry.isIntersecting);
        if (isIntersecting) {
          setIsPreviewReady(true);
          obs.disconnect();
        }
      },
      { rootMargin: "300px 0px", threshold: 0.01 },
    );

    observer.observe(sectionNode);

    return () => {
      observer.disconnect();
    };
  }, [isPreviewReady]);

  useEffect(() => {
    if (!isPreviewDialogOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewDialogOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isPreviewDialogOpen]);

  return (
    <section className="features workflow-diagram-section">
      <h2>How It Works in 5 Steps</h2>
      <p className="workflow-diagram-lead">
        Publish once, reuse everywhere. The same flow supports structured data for
        many business and operational use cases.
      </p>

      <div
        className="workflow-diagram-rail"
        aria-label="Publish workflow timeline from form input to real usage"
      >
        {workflowSteps.map((step) => (
          <article key={step.id} className="workflow-node">
            <div className="workflow-node-marker" aria-hidden="true">
              {step.id}
            </div>

            <div className="workflow-node-card" tabIndex={0}>
              <div className="workflow-node-heading">
                <h3 className="workflow-node-title">{step.title}</h3>
                <span className="workflow-node-chip">{step.badge}</span>
              </div>

              <p className="workflow-node-summary">{step.summary}</p>

              {step.snippet ? <pre className="workflow-node-snippet">{step.snippet}</pre> : null}

              <span className="workflow-node-hint">Hover for impact insight</span>

              <div className="workflow-node-popup" role="note" aria-label={`Why step ${step.id} matters`}>
                <p className="workflow-popup-title">Why this is useful</p>
                <p className="workflow-popup-text">{step.cool}</p>
                <p className="workflow-popup-else">
                  <strong>If skipped:</strong> {step.otherwise}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section
        className="workflow-preview-section"
        ref={previewSectionRef}
        aria-label="Published data preview example"
      >
        <h3 className="workflow-preview-title">
          See How Published Data Can Look (and How the Same Data Can Power Your Own System View)
        </h3>
        <p className="workflow-preview-lead">
          This example preview helps you picture the result before your first publish, so you can
          start with a clearer goal instead of an empty screen.
        </p>

        <button
          type="button"
          className="workflow-preview-thumb-button"
          disabled={!isPreviewReady}
          onClick={() => {
            if (!isPreviewReady) return;
            setIsPreviewDialogOpen((prev) => !prev);
          }}
          aria-label="Open larger published data preview image"
        >
          {isPreviewReady ? (
            <img
              src={previewImagePath}
              alt={previewImageAlt}
              className="workflow-preview-thumb-image"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="workflow-preview-placeholder">
              Scroll down to load preview image...
            </div>
          )}
        </button>

        <p className="workflow-preview-note">
          Click the preview to expand it. Click the large image again or press the close button to
          exit.
        </p>
      </section>

      <div className="workflow-bullet-panels">
        <section className="workflow-bullet-panel" aria-label="Alternative data examples">
          <h3 className="workflow-bullet-title">A Few Example Data Types</h3>
          <ul className="workflow-smart-list">
            {alternateExamples.map((item) => (
              <li key={item.title} className="workflow-smart-item">
                <span className="workflow-smart-dot" aria-hidden="true" />
                <div className="workflow-smart-text">
                  <p className="workflow-smart-label">{item.title}</p>
                  <p className="workflow-smart-sub">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="workflow-bullet-panel" aria-label="Human-readable JSON guide">
          <h3 className="workflow-bullet-title">What JSON Usually Contains</h3>
          <ul className="workflow-smart-list">
            {jsonGuide.map((item) => (
              <li
                key={item.human}
                className="workflow-smart-item workflow-smart-item-popup"
                tabIndex={0}
              >
                <span className="workflow-smart-dot" aria-hidden="true" />
                <div className="workflow-smart-text">
                  <p className="workflow-smart-label">{item.human}</p>
                  <p className="workflow-smart-sub">{item.detail}</p>
                </div>

                <div
                  className="workflow-smart-popup"
                  role="note"
                  aria-label={`Machine JSON example for ${item.human}`}
                >
                  <p className="workflow-smart-popup-title">Machine JSON Example</p>
                  <pre className="workflow-smart-popup-code">{item.machine}</pre>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {showAdvancedToolsNote && (
        <p className="workflow-advanced-note">
          <strong>Optional advanced path:</strong> Use API and CLI for automation, and run a local
          indexer deployment from GitHub for custom infrastructure.
          {" "}
          Advanced teams can also extend the indexer to index additional custom data fields and
          domain-specific links.
          {" "}
          Average users can skip this and use the UI only.
          {indexerGithubUrl ? (
            <>
              {" "}
              <a href={indexerGithubUrl} target="_blank" rel="noreferrer">
                GitHub source
              </a>
              .
            </>
          ) : null}
        </p>
      )}

      <p className="workflow-diagram-footnote">
        Why blockchain here? It gives durable records, clearer trust between parties, and simpler
        integrations over time.
      </p>

      {isPreviewDialogOpen && (
        <div
          className="workflow-preview-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded published data preview"
          onClick={() => setIsPreviewDialogOpen(false)}
        >
          <div
            className="workflow-preview-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="workflow-preview-dialog-close"
              onClick={() => setIsPreviewDialogOpen(false)}
              aria-label="Close preview dialog"
            >
              X
            </button>
            <img
              src={previewImagePath}
              alt={previewImageAlt}
              className="workflow-preview-dialog-image"
              decoding="async"
              onClick={() => setIsPreviewDialogOpen(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
