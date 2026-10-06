import { cn } from "@/lib/utils";

/**
 * Read-only label and value pairs, as a `<dl>`: two columns from small
 * screens up, one on a phone. The caller arranges the items.
 */
function DescriptionListRoot({
  className,
  ...props
}: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="description-list"
      className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}
      {...props}
    />
  );
}

function DescriptionListItem({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="description-list-item"
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
      {...props}
    />
  );
}

function DescriptionListTerm({
  className,
  ...props
}: React.ComponentProps<"dt">) {
  return (
    <dt
      data-slot="description-list-term"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DescriptionListDetails({
  className,
  ...props
}: React.ComponentProps<"dd">) {
  return (
    <dd
      data-slot="description-list-details"
      className={cn("font-medium wrap-break-word", className)}
      {...props}
    />
  );
}

export const DescriptionList = Object.assign(DescriptionListRoot, {
  Item: DescriptionListItem,
  Term: DescriptionListTerm,
  Details: DescriptionListDetails,
});
