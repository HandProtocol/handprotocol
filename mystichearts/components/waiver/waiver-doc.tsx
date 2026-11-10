"use client";

import { Check, PenLine } from "lucide-react";
import type { Block, WaiverForm } from "./waiver-api";

// One form, rendered from Kohsi's blocks (text only, never HTML). Each "initial" block is a
// conspicuous paragraph with its own Initial button: the signer stamps every one before signing.

type Props = {
  form: WaiverForm;
  initials: string;
  stamped: ReadonlySet<number>;
  onStamp: (index: number) => void;
  media?: "yes" | "no" | null;
  onMedia?: (choice: "yes" | "no") => void;
};

// Groups consecutive list items so they render as one <ul>.
function groups(blocks: Block[]) {
  const out: ({ kind: "one"; index: number; block: Block } | { kind: "ul"; items: { index: number; block: Block }[] })[] = [];
  blocks.forEach((block, index) => {
    const last = out[out.length - 1];
    if (block.t === "li") {
      if (last && last.kind === "ul") last.items.push({ index, block });
      else out.push({ kind: "ul", items: [{ index, block }] });
    } else out.push({ kind: "one", index, block });
  });
  return out;
}

export function WaiverDoc({ form, initials, stamped, onStamp, media = null, onMedia }: Props) {
  const total = form.blocks.filter((b) => b.t === "initial").length;
  return (
    <article className="wv-doc" aria-labelledby={`wv-doc-${form.key}`}>
      <header className="wv-doc-head">
        <h3 id={`wv-doc-${form.key}`}>{form.title}</h3>
        <p className="wv-doc-meta">
          Version {form.version}
          {total > 0 && (
            <span className={stamped.size === total ? "is-done" : ""}>
              {stamped.size} of {total} initialled
            </span>
          )}
        </p>
      </header>
      {groups(form.blocks).map((group) => {
        if (group.kind === "ul") {
          return (
            <ul key={`ul-${group.items[0].index}`} className="wv-list">
              {group.items.map(({ index, block }) => (
                <li key={index}>{block.text}</li>
              ))}
            </ul>
          );
        }
        const { index, block } = group;
        if (block.t === "h") return <h4 key={index}>{block.text}</h4>;
        if (block.t === "p") return <p key={index}>{block.text}</p>;
        if (block.t === "strong") return <p key={index} className="wv-strong">{block.text}</p>;
        const done = stamped.has(index);
        return (
          <div key={index} className={`wv-initial ${done ? "is-done" : ""}`}>
            <p>{block.text}</p>
            <button type="button" className="wv-stamp" onClick={() => onStamp(index)} disabled={done || initials.trim().length === 0} aria-pressed={done}>
              {done ? <Check size={16} aria-hidden="true" /> : <PenLine size={16} aria-hidden="true" />}
              {done ? <span className="wv-stamp-mark">{initials}</span> : "Initial here"}
            </button>
          </div>
        );
      })}
      {form.kind === "media" && onMedia && (
        <fieldset className="wv-choice">
          <legend>Your photo and video choice</legend>
          <label className={media === "yes" ? "is-on" : ""}>
            <input type="radio" name="media" value="yes" checked={media === "yes"} onChange={() => onMedia("yes")} />
            Yes, I am happy to appear
          </label>
          <label className={media === "no" ? "is-on" : ""}>
            <input type="radio" name="media" value="no" checked={media === "no"} onChange={() => onMedia("no")} />
            No, please leave me out
          </label>
        </fieldset>
      )}
    </article>
  );
}
