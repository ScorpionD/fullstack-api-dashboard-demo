import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Inbox,
  LoaderCircle,
} from "lucide-react";
import type { Meta } from "../types";
export const currency = (cents: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
export const date = (v: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" }).format(
    new Date(v),
  );
export function Badge({ value }: { value: string }) {
  return <span className={"badge " + value}>{value.replaceAll("-", " ")}</span>;
}
export function Loading() {
  return (
    <div className="state" role="status">
      <LoaderCircle className="spin" size={25} />
      <strong>Loading your workspace</strong>
      <span>Fetching the latest records.</span>
    </div>
  );
}
export function Empty({
  title = "Nothing here yet",
  text = "Try a different search or add your first record.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="state">
      <span className="state-icon">
        <Inbox size={25} />
      </span>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
export function ErrorPanel({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="state error-panel" role="alert">
      <AlertCircle />
      <strong>We couldn’t load this view</strong>
      <span>{message}</span>
      <button type="button" className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
export function Pagination({
  meta,
  onPage,
}: {
  meta: Meta;
  onPage: (n: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {meta.total
          ? `${(meta.page - 1) * meta.pageSize + 1}–${Math.min(meta.page * meta.pageSize, meta.total)}`
          : "0"}{" "}
        of {meta.total} records
      </span>
      <div>
        <button
          aria-label="Previous page"
          disabled={meta.page === 1}
          onClick={() => onPage(meta.page - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <span>
          Page {meta.page} of {meta.pages}
        </span>
        <button
          aria-label="Next page"
          disabled={meta.page === meta.pages}
          onClick={() => onPage(meta.page + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("input,select,button")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-title">
          <div>
            <span className="eyebrow">WORKSPACE RECORD</span>
            <h2>{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [message, onClose]);
  return (
    <div className="toast" role="status">
      <Check size={18} />
      <span>{message}</span>
      <button aria-label="Dismiss notification" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  );
}
