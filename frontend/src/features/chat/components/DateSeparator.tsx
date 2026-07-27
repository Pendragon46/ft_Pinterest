export function DateSeparator({ label }: { label: string }) {
  return (
    <li className="my-2 flex justify-center">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
    </li>
  )
}
