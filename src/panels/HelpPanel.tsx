import { FaBookOpen, FaCheckCircle, FaCompass, FaFilter, FaMagic } from 'react-icons/fa';
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
  margin: '0 0 0.9rem 0',
  color: 'var(--comment)',
  lineHeight: 1.45,
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
          <strong> {t('container.singular')}</strong> → <strong>{t('type.singular')}</strong> →{' '}
          <strong>{t('item.singular')}</strong> → <strong>{t('itemVerification.singular')}</strong>.
        </p>

        <div style={gridStyle}>
          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaCompass />
              1. Set Context
            </h3>
            <ul style={listStyle}>
              <li>Connect your wallet first.</li>
              <li>Select a {t('container.singular')} in {t('browse.containers')}.</li>
              <li>Select a {t('type.singular')} in {t('browse.types')}.</li>
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
                Use <strong>ADD DATA</strong> to create/publish records.
              </li>
              <li>
                Use <strong>Check content</strong> for JSON/XML detection and validation.
              </li>
              <li>
                Use <strong>Auto compact</strong> and optional <strong>Auto zip</strong> before
                submit.
              </li>
              <li>Use Preview to inspect the exact payload before publishing.</li>
            </ul>
          </article>

          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaFilter />
              3. Browse and Verify
            </h3>
            <ul style={listStyle}>
              <li>
                <strong>{t('browse.items')}</strong>: filtered by selected context.
              </li>
              <li>
                <strong>{t('browse.itemVerifications')}</strong>: requires selected{' '}
                {t('container.singular')}.
              </li>
              <li>
                <strong>{t('browse.receivedItems')}</strong> and{' '}
                <strong>{t('browse.receivedItemVerifications')}</strong>: review incoming data.
              </li>
            </ul>
          </article>

          <article style={cardStyle}>
            <h3 style={cardTitleStyle}>
              <FaMagic />
              4. Content Options
            </h3>
            <ul style={listStyle}>
              <li>Auto compact minifies JSON/XML formatting before publish.</li>
              <li>Auto zip stores content as `EPZIP1:gzip+base64:...` (experimental).</li>
              <li>Auto unzip decodes those values for readable UI/tables.</li>
              <li>Orange hints indicate invalid JSON/XML or ineffective zip savings.</li>
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
