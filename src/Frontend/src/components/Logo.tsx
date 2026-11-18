/** The 5C Fit mark: a bold "5" beside a "C" of nested rainbow arcs. Lives in /public so the favicon and app icons share it. */
export function Logo({ size = 112 }: { size?: number }) {
  return <img src="/logo.svg" width={size} height={size} alt="5C Fit logo" draggable={false} />
}
