import {
  FaArrowRight,
  FaBookOpen,
  FaCheckCircle,
  FaCompass,
  FaFilter,
  FaMagic,
} from 'react-icons/fa';
import { t } from '../Config.ts';
import { useSelection } from '../context/SelectionContext.tsx';

type HelpPanelProps = {
  accountAddress?: string;
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

function statusText(value?: string | null): string {
  return value ? value : '(none)';
}

export function HelpPanel({ accountAddress }: HelpPanelProps) {
  const { selectedContainerId, selectedDataTypeId } = useSelection();

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
