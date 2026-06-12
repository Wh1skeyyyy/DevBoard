import type { SVGProps } from 'react';

export type IconName =
  | 'archive'
  | 'calendar'
  | 'check'
  | 'chevron'
  | 'close'
  | 'edit'
  | 'external'
  | 'folder'
  | 'github'
  | 'gitCommit'
  | 'issue'
  | 'link'
  | 'menu'
  | 'plus'
  | 'pullRequest'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'spark'
  | 'tasks'
  | 'trash';

const paths: Record<IconName, React.ReactNode> = {
  archive: (
    <>
      <path d="M4 7h16M6 7l1 13h10l1-13M9 11h6M5 4h14v3H5z" />
    </>
  ),
  calendar: (
    <>
      <path d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: (
    <>
      <path d="m14 5 5 5M4 20l4.5-1 10-10a2 2 0 0 0-5-5l-10 10L4 20Z" />
      <path d="m12 6 5 5" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 13v7H4V6h7" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v11H3V6Z" />,
  github: (
    <path d="M12 2.8a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-4.8 0-1.1.4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.7.7 1 1.6 1 2.6 0 3.7-2.3 4.5-4.6 4.8.4.3.7 1 .7 2v3c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.8Z" />
  ),
  gitCommit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M3 12h6m6 0h6" />
    </>
  ),
  issue: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5m0 3h.01" />
    </>
  ),
  link: (
    <>
      <path d="m10 14 4-4" />
      <path d="M7 17H6a4 4 0 0 1 0-8h3M17 7h1a4 4 0 0 1 0 8h-3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pullRequest: (
    <>
      <circle cx="6" cy="5" r="2" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M6 7v10M14 5h2a2 2 0 0 1 2 2v10M14 5l2-2m-2 2 2 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 9a7 7 0 0 1 11.5-2L20 12M4 12l2.4 5a7 7 0 0 0 11.5-2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 14.5v-5l-2-.6-.8-1.8 1-1.8-3.5-2-1.4 1.4h-2.1L8.8 3.3l-3.5 2 1 1.8-.8 1.8-2 .6v5l2 .6.8 1.8-1 1.8 3.5 2 1.4-1.4h2.1l1.4 1.4 3.5-2-1-1.8.8-1.8 2-.6Z" />
    </>
  ),
  spark: <path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />,
  tasks: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m3.5 6 1 1 2-2m-3 7 1 1 2-2m-3 7 1 1 2-2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5m4-5v5" />
    </>
  ),
};

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
