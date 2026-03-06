import { ReactNode } from "react";

type NotesShellProps = {
  sidebar: ReactNode;
  content: ReactNode;
};

export function NotesShell({ sidebar, content }: NotesShellProps) {
  return (
    <div className="memo-layout">
      <aside className="surface-panel p-4 md:p-5">{sidebar}</aside>
      <section className="surface-panel p-4 md:p-5">{content}</section>
    </div>
  );
}
