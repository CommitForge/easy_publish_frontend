import { Suspense, lazy, useEffect, useState } from "react";
import { getBrandLogoPath, isCarsTranslation } from "../Config.ts";

interface IntroductionProps {
  account: any | null;
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
  "https://www.youtube.com/embed/AVfUStEqIoU?si=DkjPHmWMu5hzpTrV";
const ApiInstructions = lazy(() => import("./ApiInstructions"));
const ScriptsCarousel = lazy(() => import("./ScriptsCarousel"));

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

export function Introduction({ account }: IntroductionProps) {
  if (account) return null;

  const isCarsInstance = isCarsTranslation();
  const logoPath = getBrandLogoPath();

  const [loadApiSection, setLoadApiSection] = useState(false);
  const [loadScriptsSection, setLoadScriptsSection] = useState(false);
  const [scripts, setScripts] = useState<ScriptMap>(emptyScripts);

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

  return (
    <div className="intro-wrapper">
      {isCarsInstance ? (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="hero-left">
                <h1>Publish Car Maintenance Events on Blockchain</h1>
                <p className="subtitle">
                  Put maintenance information of your cars on blockchain and share it with others.
                </p>
                <h2 className="tagline">– The Easiest Way –</h2>
                <div className="hero-actions">
                  <span className="wallet-address"> Wallet: Not connected </span>
                </div>
              </div>
              <div className="hero-right">
                <img src={logoPath} alt="IziPublish Logo" className="hero-logo" />
              </div>
            </div>
          </section>

          <section className="cars-intro features">
            <h2>Welcome to Cars Mode!</h2>
            <p>
              This mode is designed for automotive enthusiasts, garages, and fleet managers. You can publish car maintenance data, service logs, and workflow-specific items efficiently.
            </p>
            <div className="feature-grid">
              <div className="feature">
                <h3>🚗 Publish Car Maintenance Data</h3>
                <p>Store service logs, repair history, mileage, and parts replacements in structured containers.</p>
              </div>
              <div className="feature">
                <h3>🛠 Structured & Searchable JSON</h3>
                <p>All data is structured in JSON, ready for analytics, integration, or future reference.</p>
              </div>
              <div className="feature">
                <h3>🔗 Link Car Records</h3>
                <p>Connect vehicles to their parts, maintenance events, and previous owners, forming a hierarchical workflow.</p>
              </div>
              <div className="feature">
                <h3>📤 Share & Preserve for the Future</h3>
                <p>Share car histories with other users, garages, or future buyers safely and immutably on blockchain.</p>
              </div>
            </div>
          </section>

          <section id="features2" className="features">
            <h2>How do I do that?</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>👛 1. Get IOTA Wallet</h3>
                <p>You can get it by pressing the button on the top right corner. It is a Chrome browser extension.</p>
              </div>
              <div className="feature">
                <h3>💰 2. Get a Few IOTA Tokens</h3>
                <p>To cover network fees just 5 tokens (1$ worth) can publish hundreds of content, buy or have a friend send it to your wallet.</p>
              </div>
              <div className="feature">
                <h3>🔐 3. Connect and Log in</h3>
                <p>Connect and log in to this website, by pressing button on the top right corner.</p>
              </div>
              <div className="feature">
                <h3>🚀 4. Publish the Content</h3>
                <p>Use "New Container" and then "New Type" and then "New Item" buttons, to store your content/items.</p>
              </div>
            </div>
          </section>

          <section id="features3" className="features">
            <h2>Car Report</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>Sample Car Maintenance Report</h3>
                <p>Generate a report for your vehicle directly in the app.</p>
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
        </>
      ) : (
        <>
          <section className="hero">
            <div className="hero-content">
              <div className="hero-left">
                <h1>Publish Content on Blockchain</h1>
                <p className="subtitle"> Publish, link, and index structured data using MoveVM & IOTA. </p>
                <h2 className="tagline">– The Easiest Way –</h2>
                <div className="hero-actions">
                  <span className="wallet-address"> Wallet: Not connected </span>
                </div>
                <p className="hero-secondary-link-wrap">
                  Looking for car maintenance workflows?{' '}
                  <a
                    className="hero-secondary-link"
                    href="https://cars.izipublish.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Visit Cars Mode
                  </a>
                </p>
              </div>
              <div className="hero-right">
                <img src={logoPath} alt="IziPublish Logo" className="hero-logo" />
              </div>
            </div>
          </section>
          <section id="features1" className="features">
            <h2>What is this for?</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>🔗 Put Content on Blockchain</h3>
                <p>Easiest way to store and share your content on blockchain.</p>
              </div>
              <div className="feature">
                <h3>📝 As Easy as Filling a Form</h3>
                <p>Use a simple form to publish your content.</p>
              </div>
              <div className="feature">
                <h3>👁️ View Published Content</h3>
                <p>All published data on the blockchain will be visible here in the tables.</p>
              </div>
              <div className="feature">
                <h3>🔌 Integrate Content With Systems</h3>
                <p>You will also be able to integrate the content with system to system.</p>
              </div>
            </div>
          </section>
          <section id="features2" className="features">
            <h2>How do I do that?</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>👛 1. Get IOTA Wallet</h3>
                <p>You can get it by pressing the button on the top right corner. It is a Chrome browser extension.</p>
              </div>
              <div className="feature">
                <h3>💰 2. Get a Few IOTA Tokens</h3>
                <p>To cover network fees just 5 tokens (1$ worth) can publish hundreds of content, buy or have a friend send it to your wallet.</p>
              </div>
              <div className="feature">
                <h3>🔐 3. Connect and Log in</h3>
                <p>Connect and log in to this website, by pressing button on the top right corner.</p>
              </div>
              <div className="feature">
                <h3>🚀 4. Publish the Content</h3>
                <p>Use "New Container" and then "New Type" and then "New Item" buttons, to store your content/items.</p>
              </div>
            </div>
          </section>
          <section id="features3" className="features">
            <h2>What content do I publish?</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>🧩 Supports Custom Content</h3>
                <p>You publish any content, usually in structured (machine readable) JSON format, as long as it respects terms of service.</p>
              </div>
              <div className="feature">
                <h3>🗂️ Supports Custom Workflow</h3>
                <p>You can decide what kind of data you need to put on blockchain, that will support your workflow (ie. you can specify all references that you need).</p>
              </div>
              <div className="feature">
                <h3>📦 Predefined Structure</h3>
                <p>To make things simpler, there is a predefined set of fields you can use. 'Content' is usually the field to store main data.</p>
              </div>
              <div className="feature">
                <h3>📊 Examples of Published Data</h3>
                <p>We will make a guide and examples of content. Do *not* publish things like personal data, use other data respecting terms of service.</p>
              </div>
            </div>
          </section>
          <section id="features4" className="features">
            <h2>Tell me more!</h2>
            <div className="feature-grid">
              <div className="feature">
                <h3>🏗️ Linked Containers</h3>
                <p>Attach child containers into hierarchy.</p>
              </div>
              <div className="feature">
                <h3>🔎 On-Chain and Off-Chain Indexing</h3>
                <p>Efficient traversal through recursion. Content indexed here.</p>
              </div>
              <div className="feature">
                <h3>✅ Recipient Verification Enabled</h3>
                <p>Published content can be set to 'verified' by recipients.</p>
              </div>
              <div className="feature">
                <h3>👥 Ownership Model</h3>
                <p>Multi-owner containers with safe access to publishing content.</p>
              </div>
            </div>
          </section>
          <section id="features5" className="features">
            <h2>BETA version - transient era</h2>
            <div className="feature-grid">
              <div className="feature">This is currently in beta version.</div>
              <div className="feature">You can use it, but there is more likely for issues to occur.</div>
              <div className="feature">We especially in this stage reserve the right to relaunch the platform in case of any major issues.</div>
              <div className="feature">If you want us to remove beta stage, you can help us test it and contact us at izipublish.com@gmail.com</div>
            </div>
          </section>
          <YoutubeVideoConsentSection />
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
            output on demand for a faster initial page load.
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
