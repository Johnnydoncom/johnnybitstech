"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Submit button that disables itself and shows `pendingLabel` while its form's Server Action runs. */
export function PendingButton({
  pendingLabel,
  confirmMessage,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel: string; confirmMessage?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      {...props}
      disabled={pending || props.disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
