import { useRef, useState } from "react";
import {
  PACKAGE_ID,
  CONTAINER_CHAIN_ID,
  UPDATE_CHAIN_ID,
  DATA_ITEM_CHAIN,
  DATA_ITEM_VERIFICATION_CHAIN
} from '../Config.ts';
import { copyToClipboard } from '../utils/clipboard';
import { buildObjectExplorerUrl } from '../utils/explorer';

type ModalLink = {
  title: string;
  contentKey: FooterContentKey;
};

type FooterContentKey =
  | 'TERMS_CONTENT'
  | 'PRIVACY_CONTENT'
  | 'COOKIE_CONTENT'
  | 'DISCLAIMER_CONTENT'
  | 'ABOUT_CONTENT'
  | 'CONTACT_CONTENT'
  | 'CAREERS_CONTENT'
  | 'PRESS_CONTENT'
  | 'FAQ_CONTENT'
  | 'DOCS_CONTENT'
  | 'SUPPORT_CONTENT';

type FooterContentModule = Record<FooterContentKey, string>;

let footerContentPromise: Promise<FooterContentModule> | null = null;

function loadFooterContent(): Promise<FooterContentModule> {
  if (!footerContentPromise) {
    footerContentPromise = import('./FooterContent.tsx') as Promise<FooterContentModule>;
  }
  return footerContentPromise;
}

const blockchainRows = [
  { label: 'Smart Contract', value: PACKAGE_ID },
  { label: 'Container Chain', value: CONTAINER_CHAIN_ID },
  { label: 'Update Chain', value: UPDATE_CHAIN_ID },
  { label: 'Data Item Chain', value: DATA_ITEM_CHAIN },
  { label: 'Data Item Verification Chain', value: DATA_ITEM_VERIFICATION_CHAIN },
];

const isLikelyObjectId = (value: string) => /^0x[0-9a-fA-F]+$/.test(value);

const aboutLinks: ModalLink[] = [
  { title: 'About Us', contentKey: 'ABOUT_CONTENT' },
  { title: 'Contact', contentKey: 'CONTACT_CONTENT' },
  { title: 'Contribute', contentKey: 'CAREERS_CONTENT' },
  { title: 'Press', contentKey: 'PRESS_CONTENT' },
];

const supportLinks: ModalLink[] = [
  { title: 'FAQ', contentKey: 'FAQ_CONTENT' },
  { title: 'Documentation', contentKey: 'DOCS_CONTENT' },
  { title: 'Customer Support', contentKey: 'SUPPORT_CONTENT' },
];

const legalLinks: ModalLink[] = [
  { title: 'Terms of Service', contentKey: 'TERMS_CONTENT' },
  { title: 'Privacy Policy', contentKey: 'PRIVACY_CONTENT' },
  { title: 'Cookie Policy', contentKey: 'COOKIE_CONTENT' },
  { title: 'Disclaimer', contentKey: 'DISCLAIMER_CONTENT' },
];

const socialLinks = [
  { label: 'X (Twitter)', href: 'https://x.com/EpicOasisX' },
  { label: 'GitHub MoveVM (Move)', href: 'https://github.com/CommitForge/easy_publish_movevm' },
  { label: 'GitHub CLI (JavaScript)', href: 'https://github.com/CommitForge/easy_publish_cli' },
  { label: 'GitHub Frontend (TypeScript)', href: 'https://github.com/CommitForge/easy_publish_frontend' },
  { label: 'GitHub Backend (Java)', href: 'https://github.com/CommitForge/easy_publish_backend' },
  { label: 'GitHub Deploy (Shell)', href: 'https://github.com/CommitForge/easy_publish_deploy' },
];

const donationAddress = '0x7c33d09b7b6ddbfed32bd945caae96719ae07f68863d8614c4d96d6d320af429';

export function Footer() {
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");
  const modalLoadSequence = useRef(0);

  const openModal = async (title: string, contentKey: FooterContentKey) => {
    const seq = ++modalLoadSequence.current;
    setModalTitle(title);
    setModalContent('Loading content...');

    try {
      const footerContent = await loadFooterContent();
      if (seq !== modalLoadSequence.current) return;
      const content = footerContent[contentKey];
      setModalContent(typeof content === 'string' ? content : 'Content unavailable.');
    } catch {
      if (seq !== modalLoadSequence.current) return;
      setModalContent('Could not load this content right now. Please try again.');
    }
  };

  const closeModal = () => {
    modalLoadSequence.current += 1;
    setModalContent(null);
  };

  const sectionTitleStyle = { color: 'var(--purple)', marginBottom: '0.75rem' };

  return (
    <>
      <footer
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-around',
          gap: '2rem',
          padding: '2rem',
          borderTop: '3px solid var(--purple)',
          background: 'var(--bg-deep)',
          color: 'var(--fg-muted)',
        }}
      >

        {/* Blockchain Info */}
        <div style={{ minWidth: '220px' }}>
          <h4 style={sectionTitleStyle}>Blockchain Info</h4>
          {blockchainRows.map((row) => (
            <p key={row.label} style={{ fontSize: '0.85rem' }}>
              <span>{row.label}: {row.value || '-'}</span>
              {row.value && (
                <>
                  {' '}
                  <i
                    className="bi bi-clipboard copy-icon"
                    title={`Copy ${row.label} ID`}
                    onClick={(e) => copyToClipboard(e, row.value)}
                  />
                </>
              )}
              {row.value && isLikelyObjectId(row.value) && (
                <>
                  {' '}
                  <a
                    className="explorer-icon"
                    href={buildObjectExplorerUrl(row.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${row.label} in IOTA Explorer`}
                    aria-label={`Open ${row.label} in IOTA Explorer`}
                  >
                    <i className="bi bi-box-arrow-up-right" />
                  </a>
                </>
              )}
            </p>
          ))}
        </div>

        {/* About */}
        <div style={{ minWidth: '180px' }}>
          <h4 style={sectionTitleStyle}>About</h4>
          {aboutLinks.map((link) => (
            <span
              key={link.title}
              className="footer-link"
              onClick={() => {
                void openModal(link.title, link.contentKey);
              }}
            >
              {link.title}
            </span>
          ))}
        </div>

        {/* Support */}
        <div style={{ minWidth: '180px' }}>
          <h4 style={sectionTitleStyle}>Support</h4>
          {supportLinks.map((link) => (
            <span
              key={link.title}
              className="footer-link"
              onClick={() => {
                void openModal(link.title, link.contentKey);
              }}
            >
              {link.title}
            </span>
          ))}
        </div>

        {/* Legal */}
        <div style={{ minWidth: '180px' }}>
          <h4 style={sectionTitleStyle}>Legal</h4>
          {legalLinks.map((link) => (
            <span
              key={link.title}
              className="footer-link"
              onClick={() => {
                void openModal(link.title, link.contentKey);
              }}
            >
              {link.title}
            </span>
          ))}
        </div>

        {/* Social */}
        <div style={{ minWidth: '180px' }}>
          <h4 style={sectionTitleStyle}>Follow</h4>
          {socialLinks.map((link) => (
            <a
              key={link.label}
              className="footer-link"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div
          style={{
            flexBasis: '100%',
            marginTop: '2rem',
            fontSize: '0.85rem',
            textAlign: 'center',
            color: 'var(--fg-muted)'
          }}
        >
          <div
            style={{ marginBottom: '0.4rem' }}
          >
            IOTA Donation Address: {donationAddress}
            {' '}
            <i
              className="bi bi-clipboard copy-icon"
              title="Copy donation address"
              onClick={(e) => copyToClipboard(e, donationAddress)}
            />
          </div>
          <div style={{ marginBottom: '0.4rem', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>
            Donations go to the developer and help cover server and other running costs.
          </div>
          © 2026 izipublish.com · Built on IOTA
        </div>
      </footer>

      {/* Modal */}
      {modalContent && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-alt)',
              padding: '2rem',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--purple)',
              color: 'var(--fg)',
              boxShadow: '0 0 15px rgba(148,0,211,0.4)'
            }}
          >
            <h2 style={{ color: 'var(--pink)', marginBottom: '1rem' }}>
              {modalTitle}
            </h2>

            <div
              style={{
                whiteSpace: 'pre-line',
                lineHeight: 1.6,
                fontSize: '0.95rem',
                color: 'var(--fg-muted)'
              }}
              dangerouslySetInnerHTML={{ __html: modalContent }}
            />

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <span
                className="footer-link"
                onClick={closeModal}
                style={{ display: 'inline-block' }}
              >
                Close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
