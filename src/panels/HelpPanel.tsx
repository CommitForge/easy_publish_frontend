import { useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaBookOpen,
  FaCheckCircle,
  FaCompass,
  FaFilter,
  FaMagic,
  FaPlayCircle,
  FaTable,
} from 'react-icons/fa';
import { API_BASE, t } from '../Config.ts';
import { useSelection } from '../context/SelectionContext.tsx';
import type { PanelMenuSelection } from './SidebarPanel.tsx';

type HelpPanelProps = {
  accountAddress?: string;
  setPrimaryMenuSelection?: (value: PanelMenuSelection) => void;
};

const shellStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  padding: '1rem 0 1.25rem',
};

const containerStyle: React.CSSProperties = {
  width: 'min(980px, 100%)',
  padding: '0 0.7rem',
};

const introStyle: React.CSSProperties = {
  margin: '0 0 0.35rem 0',
  color: 'var(--comment)',
  lineHeight: 1.45,
};

const flowWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
  margin: '0 0 0.55rem 0',
  padding: '0.58rem 0.62rem',
  border: '1px solid rgba(139, 233, 253, 0.35)',
  borderRadius: 12,
  background:
    'linear-gradient(90deg, rgba(139, 233, 253, 0.08), rgba(98, 114, 164, 0.08))',
};

const flowStepStyle: React.CSSProperties = {
  border: '1px solid rgba(139, 233, 253, 0.4)',
  background: 'rgba(139, 233, 253, 0.14)',
  borderRadius: 999,
  padding: '0.3rem 0.62rem',
  fontSize: '0.84rem',
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

const flowArrowStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: '50%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--cyan)',
  border: '1px solid rgba(139, 233, 253, 0.35)',
  background: 'rgba(139, 233, 253, 0.12)',
  opacity: 0.96,
  userSelect: 'none',
};

const introNoteStyle: React.CSSProperties = {
  margin: '0 0 0.9rem 0',
  color: 'var(--comment)',
  lineHeight: 1.4,
  fontSize: '0.84rem',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))',
  gap: 10,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid rgba(139, 233, 253, 0.28)',
  borderRadius: 10,
  padding: '0.75rem 0.8rem',
  background: 'rgba(255,255,255,0.02)',
};

const cardTitleStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  margin: 0,
  fontSize: '0.98rem',
};

const listStyle: React.CSSProperties = {
  margin: '0.5rem 0 0 1.05rem',
  padding: 0,
  lineHeight: 1.45,
  color: 'var(--fg)',
  opacity: 0.92,
  fontSize: '0.89rem',
};

const statusWrapStyle: React.CSSProperties = {
  marginTop: 12,
  borderTop: '1px solid rgba(98, 114, 164, 0.35)',
  paddingTop: 10,
};

const statusTitleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '0.82rem',
  color: 'var(--comment)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const statusGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 8,
};

const statusCardStyle: React.CSSProperties = {
  border: '1px solid rgba(98, 114, 164, 0.35)',
  borderRadius: 8,
  background: 'rgba(98, 114, 164, 0.08)',
  padding: '0.5rem 0.55rem',
};

const statusLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: '0.76rem',
  color: 'var(--comment)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const statusValueStyle: React.CSSProperties = {
  fontSize: '0.81rem',
  lineHeight: 1.35,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};

const beginnerSectionStyle: React.CSSProperties = {
  marginTop: 14,
  border: '1px solid rgba(80, 250, 123, 0.28)',
  borderRadius: 12,
  background: 'linear-gradient(180deg, rgba(80, 250, 123, 0.07), rgba(31, 32, 41, 0.2))',
  padding: '0.75rem 0.8rem',
};

const beginnerHeaderRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 8,
};

const beginnerStatusPillStyle: React.CSSProperties = {
  border: '1px solid rgba(80, 250, 123, 0.35)',
  borderRadius: 999,
  background: 'rgba(80, 250, 123, 0.14)',
  color: 'var(--green)',
  padding: '0.28rem 0.62rem',
  fontWeight: 700,
  fontSize: '0.82rem',
};

const beginnerStepsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 10,
};

const beginnerStepCardStyle: React.CSSProperties = {
  border: '1px solid rgba(139, 233, 253, 0.25)',
  borderRadius: 10,
  background: 'rgba(36, 37, 48, 0.68)',
  padding: '0.65rem 0.7rem',
};

const beginnerStepHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  marginBottom: 6,
};

const beginnerStepTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '0.92rem',
};

const beginnerStepStateDoneStyle: React.CSSProperties = {
  color: 'var(--green)',
  fontWeight: 700,
  fontSize: '0.78rem',
};

const beginnerStepStateTodoStyle: React.CSSProperties = {
  color: 'var(--orange)',
  fontWeight: 700,
  fontSize: '0.78rem',
};

const helperTextStyle: React.CSSProperties = {
  margin: '0 0 0.42rem 0',
  fontSize: '0.84rem',
  lineHeight: 1.45,
  color: 'var(--fg)',
  opacity: 0.92,
};

const inlineActionWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 6,
};

const inlineActionButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(139, 233, 253, 0.38)',
  borderRadius: 8,
  background: 'rgba(139, 233, 253, 0.12)',
  color: 'var(--cyan)',
  padding: '0.28rem 0.5rem',
  fontSize: '0.79rem',
  cursor: 'pointer',
};

const nextTableWrapStyle: React.CSSProperties = {
  marginTop: 12,
};

const nextTableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const nextTableCellStyle: React.CSSProperties = {
  borderBottom: '1px solid rgba(98, 114, 164, 0.33)',
  padding: '0.4rem 0.45rem',
  verticalAlign: 'top',
  fontSize: '0.83rem',
  lineHeight: 1.4,
};

type HelpCounts = {
  containers: number;
  dataTypes: number;
  dataItems: number;
};

function statusText(value?: string | null): string {
  return value ? value : '(none)';
}

export function HelpPanel({
  accountAddress,
  setPrimaryMenuSelection,
}: HelpPanelProps) {
  const { selectedContainerId, selectedDataTypeId } = useSelection();
  const [helpCounts, setHelpCounts] = useState<HelpCounts | null>(null);
  const [helpCountsLoading, setHelpCountsLoading] = useState(false);
  const [helpCountsError, setHelpCountsError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountAddress) {
      setHelpCounts(null);
      setHelpCountsLoading(false);
      setHelpCountsError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadHelpCounts = async () => {
      setHelpCountsLoading(true);
      setHelpCountsError(null);

      try {
        const params = new URLSearchParams({
          userAddress: accountAddress,
          topN: '5',
          graphLimit: '20',
        });
        const response = await fetch(
          `${API_BASE}api/analytics/dashboard?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        const totals = payload?.totals ?? {};
        const normalized: HelpCounts = {
          containers: Number(totals.containers) || 0,
          dataTypes: Number(totals.dataTypes) || 0,
          dataItems: Number(totals.dataItems) || 0,
        };
        if (!cancelled) {
          setHelpCounts(normalized);
        }
      } catch (err) {
        if (controller.signal.aborted || cancelled) return;
        setHelpCountsError(err instanceof Error ? err.message : 'Failed to load progress');
        setHelpCounts(null);
      } finally {
        if (!cancelled) {
          setHelpCountsLoading(false);
        }
      }
    };

    void loadHelpCounts();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accountAddress]);

  const stepStatus = useMemo(() => {
    const containers = helpCounts?.containers ?? 0;
    const dataTypes = helpCounts?.dataTypes ?? 0;
    const dataItems = helpCounts?.dataItems ?? 0;

    const hasContainer = containers > 0;
    const hasDataType = dataTypes > 0;
    const hasDataItem = dataItems > 0;

    const currentStep = !hasContainer ? 1 : !hasDataType ? 2 : !hasDataItem ? 3 : 4;
    const doneCount = [hasContainer, hasDataType, hasDataItem].filter(Boolean).length;

    return {
      hasContainer,
      hasDataType,
      hasDataItem,
      containers,
      dataTypes,
      dataItems,
      currentStep,
      doneCount,
      done: hasContainer && hasDataType && hasDataItem,
    };
  }, [helpCounts]);

  const goToMenu = (selection: PanelMenuSelection) => {
    setPrimaryMenuSelection?.(selection);
  };

  return (
    <section style={shellStyle}>
      <div style={containerStyle}>
        <h2 style={{ margin: '0 0 0.45rem 0' }}>
          <FaBookOpen style={{ marginRight: 8 }} />
          Quick Start Help
        </h2>
        <p style={introStyle}>
          Use this checklist to get started quickly. The required flow is usually:
        </p>
        <div style={flowWrapStyle} aria-label="Recommended data flow">
          <span style={flowStepStyle}>{t('container.singular')}</span>
          <span style={flowArrowStyle}>
            <FaArrowRight />
          </span>
          <span style={flowStepStyle}>{t('type.singular')}</span>
          <span style={flowArrowStyle}>
            <FaArrowRight />
          </span>
          <span style={flowStepStyle}>{t('item.singular')}</span>
          <span style={flowArrowStyle}>
            <FaArrowRight />
          </span>
          <span style={flowStepStyle}>{t('itemVerification.singular')}</span>
        </div>
        <p style={introNoteStyle}>
          All data is published to the IOTA blockchain, then indexed and displayed on the website.
        </p>

        <section style={beginnerSectionStyle} aria-label="Beginner step-by-step guide">
          <div style={beginnerHeaderRowStyle}>
            <h3 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <FaPlayCircle />
              Beginner Step-By-Step
            </h3>
            <span style={beginnerStatusPillStyle}>
              {stepStatus.done
                ? 'Beginner Guide Complete'
                : `You Are At Step ${stepStatus.currentStep} of 3`}
            </span>
          </div>

          <p style={helperTextStyle}>
            This guide tracks your progress and gives direct links to the exact forms needed for each
            step. Complete the first three steps once, and you are ready to use the full platform.
          </p>

          {helpCountsLoading && (
            <p style={{ ...helperTextStyle, color: 'var(--comment)' }}>Checking your current progress...</p>
          )}
          {helpCountsError && (
            <p style={{ ...helperTextStyle, color: 'var(--orange)' }}>
              Progress could not be auto-detected ({helpCountsError}). You can still use the links below.
            </p>
          )}

          <div style={beginnerStepsGridStyle}>
            <article style={beginnerStepCardStyle}>
              <div style={beginnerStepHeaderStyle}>
                <h4 style={beginnerStepTitleStyle}>Step 1: Create Your First {t('container.singular')}</h4>
                <span style={stepStatus.hasContainer ? beginnerStepStateDoneStyle : beginnerStepStateTodoStyle}>
                  {stepStatus.hasContainer
                    ? `Done (${stepStatus.containers})`
                    : 'To Do'}
                </span>
              </div>
              <p style={helperTextStyle}>
                A {t('container.singular').toLowerCase()} is the top-level workspace that groups related
                data, permissions, and ownership. Create one first so all other objects can be
                organized under it.
              </p>
              <div style={inlineActionWrapStyle}>
                <button
                  type="button"
                  style={inlineActionButtonStyle}
                  onClick={() => goToMenu('createContainer')}
                >
                  Open New {t('container.singular')} Form
                </button>
                <button
                  type="button"
                  style={inlineActionButtonStyle}
                  onClick={() => goToMenu('dashboard')}
                >
                  Open Dashboard
                </button>
              </div>
            </article>

            <article style={beginnerStepCardStyle}>
              <div style={beginnerStepHeaderStyle}>
                <h4 style={beginnerStepTitleStyle}>Step 2: Add Your First {t('type.singular')}</h4>
                <span style={stepStatus.hasDataType ? beginnerStepStateDoneStyle : beginnerStepStateTodoStyle}>
                  {stepStatus.hasDataType
                    ? `Done (${stepStatus.dataTypes})`
                    : 'To Do'}
                </span>
              </div>
              <p style={helperTextStyle}>
                A {t('type.singular').toLowerCase()} defines the schema and meaning of records you will
                publish. It keeps item data consistent so searching and verification are reliable.
              </p>
              <div style={inlineActionWrapStyle}>
                <button
                  type="button"
                  style={inlineActionButtonStyle}
                  onClick={() => goToMenu('addDataType')}
                >
                  Open New {t('type.singular')} Form
                </button>
                <button
                  type="button"
                  style={inlineActionButtonStyle}
                  onClick={() => goToMenu('dashboard')}
                >
                  Open Dashboard
                </button>
              </div>
            </article>

            <article style={beginnerStepCardStyle}>
              <div style={beginnerStepHeaderStyle}>
                <h4 style={beginnerStepTitleStyle}>Step 3: Publish Your First {t('item.singular')}</h4>
                <span style={stepStatus.hasDataItem ? beginnerStepStateDoneStyle : beginnerStepStateTodoStyle}>
                  {stepStatus.hasDataItem
                    ? `Done (${stepStatus.dataItems})`
                    : 'To Do'}
                </span>
              </div>
              <p style={helperTextStyle}>
                Your first {t('item.singular').toLowerCase()} proves the full flow works:
                creation, indexing, browsing, and optional verification. Use check/compact/preview in
                the form to publish clean content.
              </p>
              <div style={inlineActionWrapStyle}>
                <button
                  type="button"
                  style={inlineActionButtonStyle}
                  onClick={() => goToMenu('addDataItem')}
                >
                  Open New {t('item.singular')} Form
                </button>
                <button
                  type="button"
                  style={inlineActionButtonStyle}
                  onClick={() => goToMenu('publishDataItemVerification')}
                >
                  Open Verification Form
                </button>
              </div>
            </article>
          </div>

          <div style={nextTableWrapStyle}>
            <h4 style={{ margin: '0 0 6px 0', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <FaTable />
              What To Use Next
            </h4>
            <table style={nextTableStyle}>
              <thead>
                <tr>
                  <th style={{ ...nextTableCellStyle, color: 'var(--green)', width: '22%' }}>Page</th>
                  <th style={{ ...nextTableCellStyle, color: 'var(--green)', width: '58%' }}>Why Use It</th>
                  <th style={{ ...nextTableCellStyle, color: 'var(--green)', width: '20%' }}>Open</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={nextTableCellStyle}>Dashboard</td>
                  <td style={nextTableCellStyle}>See totals, trends, and graph relations across your published data.</td>
                  <td style={nextTableCellStyle}>
                    <button type="button" style={inlineActionButtonStyle} onClick={() => goToMenu('dashboard')}>
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={nextTableCellStyle}>{t('browse.items')}</td>
                  <td style={nextTableCellStyle}>Inspect your published items, filters, and item details.</td>
                  <td style={nextTableCellStyle}>
                    <button type="button" style={inlineActionButtonStyle} onClick={() => goToMenu('items')}>
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={nextTableCellStyle}>{t('browse.itemVerifications')}</td>
                  <td style={nextTableCellStyle}>Review verification status and open verification relationships.</td>
                  <td style={nextTableCellStyle}>
                    <button
                      type="button"
                      style={inlineActionButtonStyle}
                      onClick={() => goToMenu('itemVerifications')}
                    >
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={nextTableCellStyle}>{t('browse.receivedItems')}</td>
                  <td style={nextTableCellStyle}>Track data received from other publishers and workflows.</td>
                  <td style={nextTableCellStyle}>
                    <button
                      type="button"
                      style={inlineActionButtonStyle}
                      onClick={() => goToMenu('receivedItems')}
                    >
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={nextTableCellStyle}>{t('browse.receivedItemVerifications')}</td>
                  <td style={nextTableCellStyle}>Review verifications you received and follow-up signals.</td>
                  <td style={nextTableCellStyle}>
                    <button
                      type="button"
                      style={inlineActionButtonStyle}
                      onClick={() => goToMenu('receivedItemVerifications')}
                    >
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={nextTableCellStyle}>{t('browse.containerChildLinks')}</td>
                  <td style={nextTableCellStyle}>Explore container relationships and attachment structure.</td>
                  <td style={nextTableCellStyle}>
                    <button
                      type="button"
                      style={inlineActionButtonStyle}
                      onClick={() => goToMenu('containerChildLinks')}
                    >
                      Open
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={nextTableCellStyle}>{t('browse.owners')}</td>
                  <td style={nextTableCellStyle}>Manage and audit owner-level permissions for containers.</td>
                  <td style={nextTableCellStyle}>
                    <button type="button" style={inlineActionButtonStyle} onClick={() => goToMenu('owners')}>
                      Open
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaCompass />
              1. Set Context
            </h3>
            <ul style={listStyle}>
              <li>Connect your wallet first.</li>
              <li>
                Use <strong>{t('menu')}</strong> to expand/collapse the sidebar and open{' '}
                <strong>{t('help')}</strong> anytime for guidance.
              </li>
              <li>
                Work through the main sections: <strong>ADD DATA</strong>, <strong>VIEW DATA</strong>,{' '}
                <strong>RECEIVED DATA</strong>, and <strong>FOLLOW DATA</strong>.
              </li>
              <li>
                Start with <strong>Dashboard</strong>, then select context in{' '}
                <strong>{t('browse.containers')}</strong> and <strong>{t('browse.types')}</strong>.
              </li>
              <li>Disabled menu entries show tooltips with exact requirements.</li>
            </ul>
          </article>

          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaCheckCircle />
              2. Publish Data
            </h3>
            <ul style={listStyle}>
              <li>
                Create data from <strong>{t('actions.new')} {t('container.singular')}</strong>,{' '}
                <strong>{t('actions.new')} {t('type.singular')}</strong>,{' '}
                <strong>{t('actions.new')} {t('item.singular')}</strong>, and{' '}
                <strong>{t('actions.new')} {t('itemVerification.singular')}</strong>.
              </li>
              <li>
                Container actions under the container sub-menu: <strong>{t('container.singular')} {t('actions.edit')}</strong>,{' '}
                <strong>{t('actions.attach')}</strong>, <strong>{t('actions.addOwner')}</strong>, and{' '}
                <strong>{t('actions.removeOwner')}</strong>.
              </li>
              <li>
                Type action under the type sub-menu: <strong>{t('type.singular')} {t('actions.edit')}</strong>.
              </li>
              <li>
                In publish forms, use <strong>Check content</strong>, <strong>Auto compact</strong>,{' '}
                optional <strong>Auto zip</strong>, and <strong>Preview</strong> before submit.
              </li>
            </ul>
          </article>

          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaFilter />
              3. Browse and Verify
            </h3>
            <ul style={listStyle}>
              <li>
                Use <strong>{t('browse.containers')}</strong> to manage selected container context.
              </li>
              <li>
                Browse related metadata in <strong>{t('browse.containerChildLinks')}</strong> and{' '}
                <strong>{t('browse.owners')}</strong>.
              </li>
              <li>
                Use <strong>{t('browse.types')}</strong>, <strong>{t('browse.items')}</strong>, and{' '}
                <strong>{t('browse.itemVerifications')}</strong> (requires selected {t('container.singular')}).
              </li>
              <li>
                Review incoming data in <strong>{t('browse.receivedItems')}</strong> and{' '}
                <strong>{t('browse.receivedItemVerifications')}</strong>.
              </li>
            </ul>
          </article>

          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaMagic />
              4. Content and Follow Options
            </h3>
            <ul style={listStyle}>
              <li>Auto compact minifies JSON/XML formatting before publish.</li>
              <li>Auto zip stores content as `EPZIP1:gzip+base64:...` (experimental).</li>
              <li>Auto unzip decodes those values for readable UI/tables.</li>
              <li>Orange hints indicate invalid JSON/XML or ineffective zip savings.</li>
              <li>
                In <strong>FOLLOW DATA</strong>, queue updates with <strong>Follow</strong> and{' '}
                <strong>Unfollow</strong>, publish with <strong>Publish Pending</strong>, and inspect
                with <strong>View Followed</strong> / <strong>Hide Followed</strong>.
              </li>
            </ul>
          </article>
        </div>

        <div style={statusWrapStyle}>
          <h4 style={statusTitleStyle}>Current Session Context</h4>
          <div style={statusGridStyle}>
            <div style={statusCardStyle}>
              <span style={statusLabelStyle}>Connected As</span>
              <code style={statusValueStyle}>{statusText(accountAddress)}</code>
            </div>
            <div style={statusCardStyle}>
              <span style={statusLabelStyle}>Selected {t('container.singular')}</span>
              <code style={statusValueStyle}>{statusText(selectedContainerId)}</code>
            </div>
            <div style={statusCardStyle}>
              <span style={statusLabelStyle}>Selected {t('type.singular')}</span>
              <code style={statusValueStyle}>{statusText(selectedDataTypeId)}</code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
