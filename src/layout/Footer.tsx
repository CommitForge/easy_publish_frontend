import { useState } from "react";
import {
  PACKAGE_ID,
  CONTAINER_CHAIN_ID,
  UPDATE_CHAIN_ID,
  DATA_ITEM_CHAIN,
  DATA_ITEM_VERIFICATION_CHAIN
} from '../Config.ts';
import { buildObjectExplorerUrl } from '../utils/explorer';

import {
  TERMS_CONTENT,
  PRIVACY_CONTENT,
  COOKIE_CONTENT,
  DISCLAIMER_CONTENT,
  ABOUT_CONTENT,
  CONTACT_CONTENT,
  CAREERS_CONTENT,
  PRESS_CONTENT,
  FAQ_CONTENT,
  DOCS_CONTENT,
  SUPPORT_CONTENT,
} from './FooterContent.tsx';

type ModalLink = {
  title: string;
  content: string;
};

const blockchainRows = [
  { label: 'Smart Contract', value: PACKAGE_ID },
  { label: 'Container Chain', value: CONTAINER_CHAIN_ID },
  { label: 'Update Chain', value: UPDATE_CHAIN_ID },
  { label: 'Data Item Chain', value: DATA_ITEM_CHAIN },
  { label: 'Data Item Verification Chain', value: DATA_ITEM_VERIFICATION_CHAIN },
];

const isLikelyObjectId = (value: string) => /^0x[0-9a-fA-F]+$/.test(value);

const aboutLinks: ModalLink[] = [
  { title: 'About Us', content: ABOUT_CONTENT },
  { title: 'Contact', content: CONTACT_CONTENT },
  { title: 'Contribute', content: CAREERS_CONTENT },
  { title: 'Press', content: PRESS_CONTENT },
];

const supportLinks: ModalLink[] = [
  { title: 'FAQ', content: FAQ_CONTENT },
  { title: 'Documentation', content: DOCS_CONTENT },
  { title: 'Customer Support', content: SUPPORT_CONTENT },
];

const legalLinks: ModalLink[] = [
  { title: 'Terms of Service', content: TERMS_CONTENT },
  { title: 'Privacy Policy', content: PRIVACY_CONTENT },
  { title: 'Cookie Policy', content: COOKIE_CONTENT },
  { title: 'Disclaimer', content: DISCLAIMER_CONTENT },
];

const socialLinks = [
  { label: 'X (Twitter)', href: 'https://x.com/EpicOasisX' },
  { label: 'GitHub MoveVM (Move)', href: 'https://github.com/CommitForge/easy_publish_movevm' },
  { label: 'GitHub CLI (JavaScript)', href: 'https://github.com/CommitForge/easy_publish_cli' },
  { label: 'GitHub Frontend (TypeScript)', href: 'https://github.com/CommitForge/easy_publish_frontend' },
  { label: 'GitHub Backend (Java)', href: 'https://github.com/CommitForge/easy_publish_backend' },
  { label: 'GitHub Deploy (Shell)', href: 'https://github.com/CommitForge/easy_publish_deploy' },
];

export function Footer() {
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");

  const openModal = (title: string, content: string) => {
    setModalTitle(title);
    setModalContent(content);
  };

  const closeModal = () => setModalContent(null);

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
              {row.value && isLikelyObjectId(row.value) && (
                <>
                  {' '}
                  <a
                    className="footer-link"
                    href={buildObjectExplorerUrl(row.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline' }}
                    title={`Open ${row.label} in IOTA Explorer`}
                  >
                    Explorer <i className="bi bi-box-arrow-up-right" />
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
              onClick={() => openModal(link.title, link.content)}
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
              onClick={() => openModal(link.title, link.content)}
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
              onClick={() => openModal(link.title, link.content)}
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
