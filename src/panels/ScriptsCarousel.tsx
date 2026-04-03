import { useMemo, useState } from "react";
import CodeViewer from "./CodeViewer";
import VerticalNavCarousel from "./VerticalNavCarousel";
import "./ScriptsCarousel.css";

interface ScriptsCarouselProps {
  izipubScript: string;
  cliScript: string;
  commandsLibScript: string;
  iotaLibScript: string;
  loggerLibScript: string;
  packageJsonScript: string;
  envCliExampleScript: string;
  readmeScript: string;
}

type ScriptGroup = "Core CLI" | "Libraries" | "Config and Docs";

type VisibleScript = {
  title: string;
  description: string;
  usage: string;
  code: string;
  language: string;
  group: ScriptGroup;
};

export default function ScriptsCarousel({
  izipubScript,
  cliScript,
  commandsLibScript,
  iotaLibScript,
  loggerLibScript,
  packageJsonScript,
  envCliExampleScript,
  readmeScript,
}: ScriptsCarouselProps) {
  const visibleScripts = useMemo<VisibleScript[]>(
    () => [
      {
        title: "izipub.js",
        description:
          "Main CLI entry point. This is the primary script users should run. It exposes commands, help, logging, and subcommands.",
        usage: `node izipub.js --help

node izipub.js object <OBJECT_ID>
node izipub.js container <CONTAINER_ID>
node izipub.js data-type-items <DATA_TYPE_ID> -n 25
node izipub.js container-types <CONTAINER_ID> -n 25
node izipub.js data-item-verifications <DATA_ITEM_ID> -n 25
node izipub.js container-data-item-verifications <CONTAINER_ID> -n 25
node izipub.js container-links <CONTAINER_ID> -n 25

node izipub.js create-container --name "My Container" --private-key iotaprivkey...
node izipub.js create-data-type --container-id 0x... --name "My Type" --private-key iotaprivkey...
node izipub.js publish-data-item --container-id 0x... --data-type-id 0x... --name "Item A" --description "..." --content "..." --private-key iotaprivkey...
node izipub.js publish-data-item-verification --container-id 0x... --data-item-id 0x... --name "Verify A" --description "..." --content "..." --verified true --private-key iotaprivkey...
node izipub.js publish-data-item --input-file ./payload.publish-data-item.json --private-key iotaprivkey...`,
        code: izipubScript,
        language: "javascript",
        group: "Core CLI",
      },
      {
        title: "cli.sh",
        description:
          "Shell wrapper around the main CLI for convenience on Unix-like systems.",
        usage: `chmod +x cli.sh
./cli.sh
./cli.sh --help`,
        code: cliScript,
        language: "bash",
        group: "Core CLI",
      },
      {
        title: "lib/commands.js",
        description: "Core command implementations used by the main CLI.",
        usage: "Imported internally by izipub.js",
        code: commandsLibScript,
        language: "javascript",
        group: "Libraries",
      },
      {
        title: "lib/iota.js",
        description:
          "Shared IOTA client setup and blockchain access helpers used across commands.",
        usage: "Imported internally by the package",
        code: iotaLibScript,
        language: "javascript",
        group: "Libraries",
      },
      {
        title: "lib/logger.js",
        description:
          "Shared logging utilities used for consistent CLI output and diagnostics.",
        usage: "Imported internally by the package",
        code: loggerLibScript,
        language: "javascript",
        group: "Libraries",
      },
      {
        title: ".env.cli.example",
        description:
          "Starter configuration file for network, signer, and Move object IDs.",
        usage: "Copy to .env.cli and fill your real values",
        code: envCliExampleScript,
        language: "bash",
        group: "Config and Docs",
      },
      {
        title: "package.json",
        description: "Package metadata and dependencies required by the CLI.",
        usage: "Used by npm / node tooling",
        code: packageJsonScript,
        language: "json",
        group: "Config and Docs",
      },
      {
        title: "README.md",
        description: "Package documentation and usage notes for the CLI.",
        usage: "Open in a text editor or read on GitHub",
        code: readmeScript,
        language: "markdown",
        group: "Config and Docs",
      },
    ],
    [
      izipubScript,
      cliScript,
      commandsLibScript,
      iotaLibScript,
      loggerLibScript,
      packageJsonScript,
      envCliExampleScript,
      readmeScript,
    ]
  );

  const groupedScripts = useMemo(
    () =>
      (["Core CLI", "Libraries", "Config and Docs"] as ScriptGroup[])
        .map((group) => ({
          group,
          scripts: visibleScripts
            .map((script, index) => ({ script, index }))
            .filter(({ script }) => script.group === group),
        }))
        .filter(({ scripts }) => scripts.length > 0),
    [visibleScripts]
  );

  const initialIndex = useMemo(
    () => visibleScripts.findIndex((s) => s.title === "izipub.js"),
    [visibleScripts]
  );

  const [current, setCurrent] = useState(initialIndex >= 0 ? initialIndex : 0);

  const prevSlide = () => {
    setCurrent((c) => (c === 0 ? visibleScripts.length - 1 : c - 1));
  };

  const nextSlide = () => {
    setCurrent((c) => (c === visibleScripts.length - 1 ? 0 : c + 1));
  };

  const downloadAll = () => {
    const a = document.createElement("a");
    a.href = "/scripts/easy_publish_cli_scripts.zip";
    a.download = "easy_publish_cli_scripts.zip";
    a.click();
  };

  const currentScript = visibleScripts[current];
  if (!currentScript) return null;

  return (
    <div className="scripts-carousel-root">
      <h2 className="scripts-carousel-title">Integrate Content With Systems</h2>

      <div className="scripts-carousel-intro">
        <p>
          This package is trimmed to the essential CLI files.
          <strong> The main script is izipub.js</strong>.
          Retrieval and Move write functionality are available through subcommands.
        </p>

        <span>Requirement: install the </span>
        <a
          href="https://docs.iota.org/developer/ts-sdk/typescript/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--cyan)", textDecoration: "underline" }}
        >
          IOTA TypeScript SDK
        </a>

        <span className="scripts-carousel-links">
          <button
            type="button"
            onClick={downloadAll}
            className="scripts-carousel-download-btn"
          >
            Download Full Package as ZIP
          </button>

          <a
            href="https://github.com/CommitForge/easy_publish_cli"
            target="_blank"
            rel="noopener noreferrer"
            className="scripts-carousel-repo-link"
          >
            CLI GitHub
          </a>
        </span>
      </div>

      <div className="scripts-carousel-groups">
        {groupedScripts.map(({ group, scripts }) => (
          <div key={group} className="scripts-carousel-group">
            <div className="scripts-carousel-group-name">{group}</div>
            <div className="scripts-carousel-file-grid">
              {scripts.map(({ script, index }) => (
                <button
                  key={script.title}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`scripts-carousel-file-btn ${
                    index === current ? "is-active" : ""
                  }`}
                >
                  {script.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <VerticalNavCarousel
        onPrev={prevSlide}
        onNext={nextSlide}
        prevLabel="Previous script"
        nextLabel="Next script"
      >
        <article className="scripts-slide">
          <header className="scripts-slide-header">
            <h3 className="scripts-slide-title">{currentScript.title}</h3>
            <span className="scripts-slide-group">{currentScript.group}</span>
          </header>

          <p className="scripts-slide-description">{currentScript.description}</p>

          <section className="scripts-slide-section">
            <div className="scripts-slide-section-label">Usage</div>
            <CodeViewer
              title={`${currentScript.title} usage`}
              code={currentScript.usage}
              language="bash"
              maxHeight={null}
              wrapLongLines={false}
            />
          </section>

          <section className="scripts-slide-section">
            <div className="scripts-slide-section-label">Source</div>
            <CodeViewer
              title={currentScript.title}
              code={currentScript.code || "// Loading script..."}
              language={currentScript.language}
              maxHeight={1000}
              wrapLongLines={false}
            />
          </section>
        </article>
      </VerticalNavCarousel>
    </div>
  );
}
