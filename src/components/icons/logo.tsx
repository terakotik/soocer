import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <title>Tipsy Tumble Logo</title>
      <g transform="rotate(-10 12 12)">
        <circle cx="12" cy="6" r="3" />
        <path d="M12 9v7" />
        <path d="m9 16 3 4 3-4" />
        <path d="M7 11h10" />
      </g>
    </svg>
  );
}
