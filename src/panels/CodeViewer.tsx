import { useMemo, useState, type CSSProperties } from "react";
import "./CodeViewer.css";

type TokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "number"
  | "comment"
  | "property"
  | "constant";

type HighlightToken = {
  text: string;
  kind: TokenKind;
};

interface CodeViewerProps {
  code: string;
  language?: string;
  title?: string;
  maxHeight?: number | string | null;
  wrapLongLines?: boolean;
  showLineNumbers?: boolean;
}

const languageAliases: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  text: "plaintext",
};

const keywordsByLanguage: Record<string, Set<string>> = {
  javascript: new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "switch",
    "case",
    "default",
    "for",
    "while",
    "do",
    "break",
    "continue",
    "try",
    "catch",
    "finally",
    "throw",
    "new",
    "class",
    "extends",
    "import",
    "from",
    "export",
    "await",
    "async",
    "typeof",
    "instanceof",
    "in",
    "of",
  ]),
  typescript: new Set([
    "const",
    "let",
    "var",
    "function",
    "return",
    "if",
    "else",
    "switch",
    "case",
    "default",
    "for",
    "while",
    "do",
    "break",
    "continue",
    "try",
    "catch",
    "finally",
    "throw",
    "new",
    "class",
    "extends",
    "import",
    "from",
    "export",
    "await",
    "async",
    "interface",
    "type",
    "enum",
    "implements",
    "readonly",
    "public",
    "private",
    "protected",
  ]),
  bash: new Set([
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "in",
    "do",
    "done",
    "while",
    "case",
    "esac",
    "function",
    "return",
    "export",
    "local",
    "readonly",
  ]),
  json: new Set([]),
  http: new Set([
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD",
  ]),
  markdown: new Set(["TODO", "NOTE"]),
  plaintext: new Set([]),
};

const constants = new Set(["true", "false", "null", "undefined"]);
const tokenPattern =
  /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w-]*\b/g;

function normalizeLanguage(input?: string): string {
  const raw = (input ?? "plaintext").trim().toLowerCase();
  return languageAliases[raw] ?? raw;
}

function classifyToken(token: string, language: string, remainder: string): TokenKind {
  const firstChar = token[0];
  if (token.startsWith("//") || token.startsWith("#")) {
    return "comment";
  }

  if (firstChar === '"' || firstChar === "'" || firstChar === "`") {
    if (language === "json" && /^\s*:/.test(remainder)) return "property";
    return "string";
  }

  if (/^\d+(\.\d+)?$/.test(token)) {
    return "number";
  }

  if (constants.has(token)) {
    return "constant";
  }

  if (keywordsByLanguage[language]?.has(token)) {
    return "keyword";
  }

  return "plain";
}

function tokenizeLine(line: string, language: string): HighlightToken[] {
  if (language === "markdown" && /^\s*#{1,6}\s/.test(line)) {
    return [{ text: line, kind: "keyword" }];
  }

  const tokens: HighlightToken[] = [];
  let cursor = 0;
  const regex = new RegExp(tokenPattern);
  let match = regex.exec(line);

  while (match) {
    const token = match[0];
    const start = match.index;
    const end = start + token.length;

    if (start > cursor) {
      tokens.push({ text: line.slice(cursor, start), kind: "plain" });
    }

    const remainder = line.slice(end);
    tokens.push({
      text: token,
      kind: classifyToken(token, language, remainder),
    });
    cursor = end;
    match = regex.exec(line);
  }

  if (cursor < line.length) {
    tokens.push({ text: line.slice(cursor), kind: "plain" });
  }

  if (tokens.length === 0) {
    tokens.push({ text: " ", kind: "plain" });
  }

  return tokens;
}

export default function CodeViewer({
  code,
  language = "plaintext",
  title,
  maxHeight = 360,
  wrapLongLines = false,
  showLineNumbers = true,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedCode = useMemo(() => (code ?? "").replace(/\r\n?/g, "\n"), [code]);

  const lines = useMemo(() => normalizedCode.split("\n"), [normalizedCode]);
  const highlightedLines = useMemo(
    () => lines.map((line) => tokenizeLine(line, normalizedLanguage)),
    [lines, normalizedLanguage]
  );

  const styleVar = {
    ["--code-viewer-max-height" as string]:
      maxHeight == null ? "none" : typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
  } as CSSProperties;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-viewer-root" style={styleVar}>
      <div className="code-viewer-header">
        <div className="code-viewer-meta">
          {title ? <span className="code-viewer-title">{title}</span> : null}
          <span className="code-viewer-language">{normalizedLanguage}</span>
        </div>
        <button type="button" className="code-viewer-copy-btn" onClick={copyCode}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="code-viewer-body">
        {highlightedLines.map((tokens, index) => (
          <div key={index} className="code-viewer-line">
            {showLineNumbers ? (
              <span className="code-viewer-line-number">{index + 1}</span>
            ) : null}
            <span
              className={`code-viewer-line-code ${
                wrapLongLines ? "code-viewer-line-code--wrap" : ""
              }`}
            >
              {tokens.map((token, tokenIndex) => (
                <span key={tokenIndex} className={`code-token code-token--${token.kind}`}>
                  {token.text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
