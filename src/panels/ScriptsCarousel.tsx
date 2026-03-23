import { useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";

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
  const SCRIPT_LINES_PER_CHUNK = 220;

  const visibleScripts = useMemo(
    () => [
      {
        title: "izipub.js",
        description:
          "Main CLI entrypoint. This is the primary script users should run. It exposes the real commands with help, logging, and subcommands.",
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
      },
      {
        title: "lib/commands.js",
        description:
          "Core command implementations used by the main CLI.",
        usage: "Imported internally by izipub.js",
        code: commandsLibScript,
        language: "javascript",
      },
      {
        title: "lib/iota.js",
        description:
          "Shared IOTA client setup and blockchain access helpers used across commands.",
        usage: "Imported internally by the package",
        code: iotaLibScript,
        language: "javascript",
      },
      {
        title: "lib/logger.js",
        description:
          "Shared logging utilities used for consistent CLI output and diagnostics.",
        usage: "Imported internally by the package",
        code: loggerLibScript,
        language: "javascript",
      },
      {
        title: ".env.cli.example",
        description:
          "Starter configuration file for network, signer, and Move object IDs.",
        usage: "Copy to .env.cli and fill your real values",
        code: envCliExampleScript,
        language: "bash",
      },
      {
        title: "README.md",
        description:
          "Package documentation and usage notes for the CLI.",
        usage: "Open in a text editor or read on GitHub",
        code: readmeScript,
        language: "markdown",
      },
      {
        title: "package.json",
        description:
          "Package metadata and dependencies required by the CLI.",
        usage: "Used by npm / node tooling",
        code: packageJsonScript,
        language: "json",
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

  const allFilesForZip = useMemo(
    () =>
      visibleScripts.map((script) => ({
        path: script.title,
        code: script.code,
      })),
    [visibleScripts]
  );

  const initialIndex = useMemo(
    () => visibleScripts.findIndex((s) => s.title === "izipub.js"),
    [visibleScripts]
  );

  const [current, setCurrent] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [scriptChunkIndex, setScriptChunkIndex] = useState(0);

  const prevSlide = () => {
    setCurrent((c) => (c === 0 ? visibleScripts.length - 1 : c - 1));
  };

  const nextSlide = () => {
    setCurrent((c) => (c === visibleScripts.length - 1 ? 0 : c + 1));
  };

  useEffect(() => {
    setScriptChunkIndex(0);
  }, [current]);

  const downloadAll = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    allFilesForZip.forEach((file) => {
      zip.file(file.path, file.code || "");
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "izipublisher_scripts_refactored.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentScript = visibleScripts[current];
  const scriptChunks = useMemo(() => {
    const rawCode = currentScript?.code || "";
    const lines = rawCode.split("\n");

    if (lines.length <= SCRIPT_LINES_PER_CHUNK) {
      return [rawCode];
    }

    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += SCRIPT_LINES_PER_CHUNK) {
      chunks.push(lines.slice(i, i + SCRIPT_LINES_PER_CHUNK).join("\n"));
    }
    return chunks;
  }, [currentScript]);

  return (
    <section
      id="scripts"
      className="scripts"
      style={{
        padding: "2rem",
        backgroundColor: "#1e1e1e",
        borderRadius: "0.5rem",
        width: "min(100%, 980px)",
        maxWidth: "980px",
        margin: "0 auto",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <h2 style={{ marginBottom: "1rem", color: "#ffd700" }}>
        🔌 Integrate Content With Systems
      </h2>

      <div style={{ marginBottom: "1rem", color: "#ccc", lineHeight: 1.6 }}>
        <div style={{ marginBottom: "0.5rem" }}>
          This package is trimmed to the essential CLI files.
          <strong> The main script is izipub.js</strong>.
          Retrieval and Move write functionality are available through subcommands.
        </div>

        <span>Requirement: install the </span>
        <a
          href="https://docs.iota.org/developer/ts-sdk/typescript/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4fc3f7", textDecoration: "underline" }}
        >
          IOTA TypeScript SDK
        </a>

        <span
          style={{
            display: "inline-flex",
            gap: "0.75rem",
            marginTop: "0.5rem",
            marginLeft: "1rem",
            flexWrap: "wrap",
            verticalAlign: "middle",
          }}
        >
          <button
            onClick={downloadAll}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              border: "none",
              backgroundColor: "#ffd700",
              color: "#000",
              cursor: "pointer",
            }}
          >
            💾 Download Full Package as ZIP
          </button>

          <a
            href="https://github.com/CommitForge/easy_publish_cli"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              border: "1px solid #4fc3f7",
              color: "#4fc3f7",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            CLI GitHub
          </a>
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "0.75rem",
        }}
      >
        <div style={{ width: "100%", overflowX: "auto" }}>
          <div style={{ display: "inline-flex", gap: "0.5rem", minWidth: "max-content" }}>
            {visibleScripts.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setCurrent(i)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.25rem",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: i === current ? "#4fc3f7" : "#333",
                  color: i === current ? "#000" : "#ccc",
                  whiteSpace: "nowrap",
                }}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          overflowX: "auto",
          overflowY: "hidden",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <div
          style={{
            minWidth: 760,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <h3
            style={{
              marginBottom: "1rem",
              color: "#4fc3f7",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {currentScript.title}
          </h3>

          <p
            style={{
              marginBottom: "0.5rem",
              color: "#ccc",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {currentScript.description}
          </p>

          <p style={{ marginBottom: "0.5rem", color: "#ccc" }}>Usage:</p>
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              borderRadius: "0.25rem",
            }}
          >
            <SyntaxHighlighter
              language="bash"
              style={dark}
              showLineNumbers
              customStyle={{
                margin: 0,
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
              wrapLongLines={true}
              wrapLines={true}
            >
              {currentScript.usage}
            </SyntaxHighlighter>
          </div>

          <div
            style={{
              margin: "1rem 0 0.5rem 0",
              color: "#ccc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span>
              Script
              {scriptChunks.length > 1
                ? ` (Part ${scriptChunkIndex + 1}/${scriptChunks.length})`
                : ""}
              :
            </span>
            {scriptChunks.length > 1 && (
              <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                <button
                  onClick={() =>
                    setScriptChunkIndex((idx) => Math.max(0, idx - 1))
                  }
                  disabled={scriptChunkIndex === 0}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    border: "1px solid #555",
                    background: scriptChunkIndex === 0 ? "#2a2a2a" : "#333",
                    color: scriptChunkIndex === 0 ? "#777" : "#ddd",
                    cursor: scriptChunkIndex === 0 ? "default" : "pointer",
                  }}
                >
                  ← Part
                </button>
                <button
                  onClick={() =>
                    setScriptChunkIndex((idx) =>
                      Math.min(scriptChunks.length - 1, idx + 1)
                    )
                  }
                  disabled={scriptChunkIndex >= scriptChunks.length - 1}
                  style={{
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    border: "1px solid #555",
                    background:
                      scriptChunkIndex >= scriptChunks.length - 1 ? "#2a2a2a" : "#333",
                    color:
                      scriptChunkIndex >= scriptChunks.length - 1 ? "#777" : "#ddd",
                    cursor:
                      scriptChunkIndex >= scriptChunks.length - 1 ? "default" : "pointer",
                  }}
                >
                  Part →
                </button>
              </div>
            )}
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              borderRadius: "0.25rem",
            }}
          >
            <SyntaxHighlighter
              language={currentScript.language}
              style={dark}
              showLineNumbers
              customStyle={{
                margin: 0,
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                boxSizing: "border-box",
              }}
              wrapLongLines={false}
              wrapLines={false}
            >
              {(scriptChunks[scriptChunkIndex] ?? currentScript.code) || "// Loading script..."}
            </SyntaxHighlighter>
          </div>
        </div>

        <button
          onClick={prevSlide}
          aria-label="Previous script"
          style={{
            position: "absolute",
            top: "50%",
            left: "0",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          ◀
        </button>

        <button
          onClick={nextSlide}
          aria-label="Next script"
          style={{
            position: "absolute",
            top: "50%",
            right: "0",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          ▶
        </button>
      </div>
    </section>
  );
}
