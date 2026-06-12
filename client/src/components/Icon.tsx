import type { SVGProps } from 'react';

export type IconName =
  | 'archive'
  | 'calendar'
  | 'check'
  | 'chevron'
  | 'close'
  | 'edit'
  | 'folder'
  | 'menu'
  | 'plus'
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
  folder: <path d="M3 6h7l2 2h9v11H3V6Z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  plus: <path d="M12 5v14M5 12h14" />,
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
