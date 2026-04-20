import { Suspense, lazy, useEffect, useState } from "react";
import { useConnectWallet, useWallets } from "@iota/dapp-kit";
import { getBrandLogoPath, isCarsTranslation } from "../Config.ts";
import { SectionFeatureTitle } from "../assets/section-icons/SectionFeatureTitle.tsx";
import WorkflowDiagramSection from "./WorkflowDiagramSection.tsx";
import type { IconType } from "react-icons";
import {
  LuBadgeCheck,
  LuBoxes,
  LuCar,
  LuChartBar,
  LuChevronDown,
  LuClipboardList,
  LuCoins,
  LuDatabase,
  LuEye,
  LuFileJson,
  LuFilePenLine,
  LuLink2,
  LuPlugZap,
  LuPuzzle,
  LuRocket,
  LuSearchCheck,
  LuShare2,
  LuShieldCheck,
  LuUsers,
  LuWallet,
  LuWorkflow,
} from "react-icons/lu";

interface IntroductionProps {
  account: unknown | null;
}

type ScriptMap = {
  izipubFile: string;
  cliFile: string;
  commandsLibFile: string;
  iotaLibFile: string;
  loggerLibFile: string;
  packageJsonFile: string;
  envCliExampleFile: string;
  readmeFile: string;
};

type ShareLink = {
  label: string;
  href: string;
  iconClass: string;
};

const emptyScripts: ScriptMap = {
  izipubFile: "",
  cliFile: "",
  commandsLibFile: "",
  iotaLibFile: "",
  loggerLibFile: "",
  packageJsonFile: "",
  envCliExampleFile: "",
  readmeFile: "",
};

const YOUTUBE_VIDEO_SRC =
  "https://www.youtube.com/embed/Wk_Z9NWsMcg";
const IOTA_WALLET_DOWNLOAD_URL =
  "https://chromewebstore.google.com/detail/iota-wallet/iidjkmdceolghepehaaddojmnjnkkija?pli=1";
const ApiInstructions = lazy(() => import("./ApiInstructions"));
const ScriptsCarousel = lazy(() => import("./ScriptsCarousel"));

type IntroFaqCard = {
  title: string;
  description: string;
  icon: IconType;
};

type IntroFaqGroup = {
  id: string;
  title: string;
  items: IntroFaqCard[];
};

const INTRO_FAQ_GROUPS: IntroFaqGroup[] = [
  {
    id: "what-is-this-for",
    title: "What is this for?",
    items: [
      {
        title: "Put Content on Blockchain",
        description:
          "Store and share your content on-chain with transparent history and ownership.",
        icon: LuDatabase,
      },
      {
        title: "As Easy as Filling a Form",
        description:
          "Use guided forms instead of manual transactions to publish data quickly.",
        icon: LuFilePenLine,
      },
      {
        title: "View Published Content",
        description:
          "Browse published records in tables and inspect linked objects with ease.",
        icon: LuEye,
      },
      {
        title: "Integrate Content With Systems",
        description:
          "Connect published content to external systems, workflows, and automations.",
        icon: LuPlugZap,
      },
    ],
  },
  {
    id: "how-do-i-do-that",
    title: "How do I do that?",
    items: [
      {
        title: "1. Get IOTA Wallet",
        description:
          "Install the IOTA Wallet browser extension, then open it from your top-right wallet button.",
        icon: LuWallet,
      },
      {
        title: "2. Get a Few IOTA Tokens",
        description:
          "A few IOTA tokens cover many transactions; around 5 tokens can publish a large amount of data.",
        icon: LuCoins,
      },
      {
        title: "3. Connect and Log in",
        description:
          "Connect your wallet using the top-right button, then sign in to start publishing.",
        icon: LuShieldCheck,
      },
      {
        title: "4. Publish the Content",
        description:
          "Create a Container, then a Type, then an Item to publish your content.",
        icon: LuRocket,
      },
    ],
  },
  {
    id: "what-content-do-i-publish",
    title: "What content do I publish?",
    items: [
      {
        title: "Supports Custom Content",
        description:
          "Publish any content, usually structured JSON, as long as it respects the platform terms.",
        icon: LuPuzzle,
      },
      {
        title: "Supports Custom Workflow",
        description:
          "Design your own data workflow, including references and links between related records.",
        icon: LuWorkflow,
      },
      {
        title: "Predefined Structure",
        description:
          "Use predefined fields for faster setup; the Content field usually stores your main data.",
        icon: LuBoxes,
      },
      {
        title: "Examples of Published Data",
        description:
          "Use examples and guides before publishing, and avoid sensitive personal information.",
        icon: LuChartBar,
      },
    ],
  },
  {
    id: "tell-me-more",
    title: "Tell me more!",
    items: [
      {
        title: "Linked Containers",
        description:
          "Build hierarchies by attaching child containers to parent containers.",
        icon: LuLink2,
      },
      {
        title: "On-Chain and Off-Chain Indexing",
        description:
          "Traverse records on-chain and off-chain with efficient recursive indexing.",
        icon: LuSearchCheck,
      },
      {
        title: "Recipient Verification Enabled",
        description:
          "Allow recipients to mark items as verified when confirmation is required.",
        icon: LuBadgeCheck,
      },
      {
        title: "Ownership Model",
        description:
          "Use multi-owner containers for safer collaboration and controlled publishing access.",
        icon: LuUsers,
      },
    ],
  },
];

async function fetchFirstText(paths: string[]): Promise<string> {
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // ignore and continue
    }
  }
  return `// Could not load any of:\n// ${paths.join("\n// ")}`;
}

function YoutubeVideoConsentSection() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section id="features6" className="features video-consent-panel">
      <h2>Watch Demo Video</h2>
      <p className="video-consent-text">
        This video is hosted by YouTube. Clicking the button below will load
        content from YouTube and may set YouTube cookies.
      </p>
      <div className="video-consent-actions">
        <button
          type="button"
          className="btn primary video-consent-toggle"
          onClick={() => setShowVideo((prev) => !prev)}
        >
          {showVideo ? "Hide YouTube Video" : "Load YouTube Video"}
        </button>
      </div>
      {showVideo && (
        <div className="video-embed-shell">
          <iframe
            src={YOUTUBE_VIDEO_SRC}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      )}
    </section>
  );
}

function IntroWalletConnectSection() {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();

  return (
    <section className="features intro-wallet-cta-panel">
      <h2>Connect to IOTA Wallet</h2>
      <p className="intro-wallet-cta-text">
        Connect your wallet to publish, link, verify, and explore on-chain
        content in iziPublish.
      </p>
      <div className="intro-wallet-cta-actions">
        {wallets.length > 0 &&
          wallets.map((wallet) => (
            <button
              type="button"
              className="btn primary btn-neon wallet-connect-btn intro-wallet-connect-btn"
              key={wallet.name}
              onClick={() =>
                connect({ wallet }, { onSuccess: () => console.log("connected") })
              }
            >
              <span className="wallet-connect-btn-label">
                Connect to {wallet.name}
              </span>
            </button>
          ))}

        {wallets.length === 0 && (
          <button
            type="button"
            className="btn primary btn-neon wallet-connect-btn intro-wallet-connect-btn"
            onClick={() => window.open(IOTA_WALLET_DOWNLOAD_URL, "_blank")}
          >
            <span className="wallet-connect-btn-label">
              Get IOTA Wallet to Connect
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

function IntroFaqSection() {
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  return (
    <section id="intro-faq" className="features intro-faq-panel">
      <h2>FAQ</h2>
      <p className="intro-faq-lead">
        Quick answers first. Expand each section when you need more detail.
      </p>

      <div className="intro-faq-list">
        {INTRO_FAQ_GROUPS.map((group) => {
          const isOpen = openSectionId === group.id;
          const panelId = `intro-faq-panel-${group.id}`;
          return (
            <article
              key={group.id}
              className={`intro-faq-item ${isOpen ? "is-open" : ""}`.trim()}
            >
              <button
                type="button"
                className="intro-faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenSectionId((prev) => (prev === group.id ? null : group.id))
                }
              >
                <span>{group.title}</span>
                <LuChevronDown
                  className={`intro-faq-trigger-icon ${
                    isOpen ? "is-open" : ""
                  }`.trim()}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div id={panelId} className="intro-faq-content">
                  <div className="feature-grid">
                    {group.items.map((item) => (
                      <div className="feature" key={item.title}>
                        <h3>
                          <SectionFeatureTitle icon={item.icon}>
                            {item.title}
                          </SectionFeatureTitle>
                        </h3>
                        <p>{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Introduction({ account }: IntroductionProps) {
  const isCarsInstance = isCarsTranslation();
  const logoPath = getBrandLogoPath();

  const [loadApiSection, setLoadApiSection] = useState(false);
  const [loadScriptsSection, setLoadScriptsSection] = useState(false);
  const [scripts, setScripts] = useState<ScriptMap>(emptyScripts);
  const showWorkflowAdvancedToolsNote = true;
  const workflowIndexerGithubUrl = "https://github.com/CommitForge";
  const shareBaseUrl =
    typeof window !== "undefined" && window.location.href
      ? window.location.href
      : "https://izipublish.com";
  const encodedShareUrl = encodeURIComponent(shareBaseUrl);
  const encodedShareText = encodeURIComponent(
    "Publish and verify on-chain content with iziPublish."
  );
  const shareLinks: ShareLink[] = [
    {
      label: "X",
      href: `https://x.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}`,
      iconClass: "bi bi-twitter-x",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`,
      iconClass: "bi bi-facebook",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`,
      iconClass: "bi bi-linkedin",
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedShareText}%20${encodedShareUrl}`,
      iconClass: "bi bi-whatsapp",
    },
  ];

  useEffect(() => {
    if (!loadScriptsSection) return;

    let cancelled = false;

    async function loadScripts() {
      const [
        izipubFile,
        cliFile,
        commandsLibFile,
        iotaLibFile,
        loggerLibFile,
        packageJsonFile,
        envCliExampleFile,
        readmeFile,
      ] = await Promise.all([
        fetchFirstText(["/scripts/izipub.js"]),
        fetchFirstText(["/scripts/cli.sh"]),
        fetchFirstText(["/scripts/lib/commands.js"]),
        fetchFirstText(["/scripts/lib/iota.js"]),
        fetchFirstText(["/scripts/lib/logger.js"]),
        fetchFirstText(["/scripts/package.json"]),
        fetchFirstText(["/scripts/.env.cli.example", "/scripts/env.cli.example"]),
        fetchFirstText(["/scripts/README.md"]),
      ]);

      if (cancelled) return;

      setScripts({
        izipubFile,
        cliFile,
        commandsLibFile,
        iotaLibFile,
        loggerLibFile,
        packageJsonFile,
        envCliExampleFile,
        readmeFile,
      });
    }

    loadScripts();

    return () => {
      cancelled = true;
    };
  }, [loadScriptsSection]);

  if (account) return null;

  return (
    <div className="intro-wrapper">
      {isCarsInstance ? (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="hero-left">
                <h1>Publish Car Maintenance Events on Blockchain</h1>
                <p className="subtitle">
                  Publish your car maintenance records on-chain and share trusted history with others.
                </p>
                <h2 className="tagline">– The Easiest Way –</h2>
                <div className="hero-actions">
                  <span className="wallet-address"> Wallet: Not connected </span>
                </div>
              </div>
              <div className="hero-right">
                <img src={logoPath} alt="iziPublish Logo" className="hero-logo" />
              </div>
            </div>
          </section>

          <IntroWalletConnectSection />

          <section className="features share-strip">
            <h2>Share iziPublish</h2>
            <div className="share-strip-row">
              {shareLinks.map((link) => (
                <a
                  key={link.label}
                  className="share-strip-btn"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Share on ${link.label}`}
                >
                  <i className={link.iconClass} aria-hidden="true" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="cars-intro features">
            <h2>Welcome to Cars Mode!</h2>
            <p>
              This mode is built for car owners, garages, and fleets. Publish maintenance logs and workflow items in a clear structure.
            </p>
            <div className="feature-grid">
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuCar}>
                    Publish Car Maintenance Data
                  </SectionFeatureTitle>
                </h3>
                <p>Store service history, mileage, repairs, and parts replacements in structured containers.</p>
              </div>
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuFileJson}>
                    Structured &amp; Searchable JSON
                  </SectionFeatureTitle>
                </h3>
                <p>Data is saved as structured JSON, ready for search, integrations, and long-term reference.</p>
              </div>
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuLink2}>
                    Link Car Records
                  </SectionFeatureTitle>
                </h3>
                <p>Link vehicles with parts, maintenance events, and owners to build a clean historical timeline.</p>
              </div>
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuShare2}>
                    Share &amp; Preserve for the Future
                  </SectionFeatureTitle>
                </h3>
                <p>Share trusted car history with garages, buyers, or partners using immutable blockchain records.</p>
              </div>
            </div>
          </section>

          <section id="features2" className="features">
            <h2>How do I do that?</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuWallet}>
                    1. Get IOTA Wallet
                  </SectionFeatureTitle>
                </h3>
                <p>Install the IOTA Wallet browser extension, then open it from your top-right wallet button.</p>
              </div>
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuCoins}>
                    2. Get a Few IOTA Tokens
                  </SectionFeatureTitle>
                </h3>
                <p>A few IOTA tokens cover many transactions; around 5 tokens can publish a large amount of data.</p>
              </div>
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuShieldCheck}>
                    3. Connect and Log in
                  </SectionFeatureTitle>
                </h3>
                <p>Connect your wallet using the top-right button, then sign in to start publishing.</p>
              </div>
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuRocket}>
                    4. Publish the Content
                  </SectionFeatureTitle>
                </h3>
                <p>Create a Container, then a Type, then an Item to publish your content.</p>
              </div>
            </div>
          </section>

          <section id="features3" className="features">
            <h2>Car Report</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>
                  <SectionFeatureTitle icon={LuClipboardList}>
                    Sample Car Maintenance Report
                  </SectionFeatureTitle>
                </h3>
                <p>Generate a sample maintenance report for your vehicle directly from the app.</p>
                <form
                  action="https://cars.izipublish.com/izipublish/api/report/car"
                  method="POST"
                  target="_blank"
                >
                  <input
                    type="hidden"
                    name="dataTypeId"
                    value="0xd218b14882d711e04802b5a7eb327880933b89d7fdcd4938c58eb06826215a20"
                  />
                  <button type="submit" className="btn primary">
                    Generate Report
                  </button>
                </form>
              </div>
            </div>
          </section>

          <WorkflowDiagramSection
            carsMode={true}
            showAdvancedToolsNote={showWorkflowAdvancedToolsNote}
            indexerGithubUrl={workflowIndexerGithubUrl}
          />
        </>
      ) : (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="hero-left">
                <h1>Publish Content on Blockchain</h1>
                <p className="subtitle"> Publish, link, and index structured data on MoveVM and IOTA. </p>
                <h2 className="tagline">– The Easiest Way –</h2>
                <div className="hero-actions">
                  <span className="wallet-address"> Wallet: Not connected </span>
                </div>
                <p className="hero-secondary-link-wrap">
                  Need car maintenance workflows? Switch the header mode to{' '}
                  <strong>Cars</strong>.
                </p>
              </div>
              <div className="hero-right">
                <img src={logoPath} alt="iziPublish Logo" className="hero-logo" />
              </div>
            </div>
          </section>

          <IntroWalletConnectSection />

          <section className="features share-strip">
            <h2>Share iziPublish</h2>
            <div className="share-strip-row">
              {shareLinks.map((link) => (
                <a
                  key={link.label}
                  className="share-strip-btn"
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Share on ${link.label}`}
                >
                  <i className={link.iconClass} aria-hidden="true" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </section>

          <YoutubeVideoConsentSection />

          <IntroFaqSection />

          <WorkflowDiagramSection
            carsMode={false}
            showAdvancedToolsNote={showWorkflowAdvancedToolsNote}
            indexerGithubUrl={workflowIndexerGithubUrl}
          />

          <section id="features5" className="features">
            <h2>BETA version - transient era</h2>
            <div className="feature-grid">
              <div className="feature">The platform is currently in beta and still evolving.</div>
              <div className="feature">You can already use it, but occasional issues may still appear during this stage.</div>
              <div className="feature">During beta, we may relaunch parts of the platform if major issues require a clean reset.</div>
              <div className="feature">To help us exit beta faster, please test and share feedback at izipublish.com@gmail.com.</div>
            </div>
          </section>
        </>
      )}

    <section
      id="api"
      className="features api lazy-section"
    >
      {!loadApiSection && (
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
            color: "var(--fg-muted)",
          }}
        >
          <h2>Universal Output API</h2>
          <p style={{ marginBottom: 14 }}>
            Load comprehensive API instructions, request examples, and a sample
            output on demand for a faster initial page load. The items endpoint
            supports backend-side data-item search and ordering (default: latest created first).
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => setLoadApiSection(true)}
          >
            Load API Instructions Section
          </button>
        </div>
      )}

      {loadApiSection && (
        <div style={{ width: "100%" }}>
          <Suspense
            fallback={
              <div style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                Loading API instructions section...
              </div>
            }
          >
            <ApiInstructions />
          </Suspense>
        </div>
      )}
    </section>

    <section
      id="scripts"
      className="features scripts lazy-section"
    >
      {!loadScriptsSection && (
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            textAlign: "center",
            color: "var(--fg-muted)",
          }}
        >
          <h2>CLI Integration Examples</h2>
          <p style={{ marginBottom: 14 }}>
            Load interactive CLI docs and script code samples on demand for a
            faster initial page load.
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={() => setLoadScriptsSection(true)}
          >
            Load CLI Scripts Section
          </button>
        </div>
      )}

      {loadScriptsSection && (
        <div style={{ width: "100%" }}>
          <Suspense
            fallback={
              <div style={{ textAlign: "center", color: "var(--fg-muted)" }}>
                Loading CLI scripts section...
              </div>
            }
          >
            <ScriptsCarousel
              izipubScript={scripts.izipubFile}
              cliScript={scripts.cliFile}
              commandsLibScript={scripts.commandsLibFile}
              iotaLibScript={scripts.iotaLibFile}
              loggerLibScript={scripts.loggerLibFile}
              packageJsonScript={scripts.packageJsonFile}
              envCliExampleScript={scripts.envCliExampleFile}
              readmeScript={scripts.readmeFile}
            />
          </Suspense>
        </div>
      )}
    </section>
  </div>
  );
}
