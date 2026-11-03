"use client";

import { Button } from "@/components/ui/button";

/** Submit button that asks for confirmation first (for destructive admin actions). */
export function ConfirmButton({ message, children, ...props }: React.ComponentProps<typeof Button> & { message: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
