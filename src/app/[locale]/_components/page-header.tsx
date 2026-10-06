import { cn } from "@/lib/utils";

/** The top of a page's content: its `<h1>` and an optional description. */
function PageHeaderRoot({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header"
      className={cn("mb-6 flex flex-col gap-1", className)}
      {...props}
    />
  );
}

function PageHeaderTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-header-title"
      className={cn(
        "text-2xl font-bold text-balance text-brand-navy-dark",
        className,
      )}
      {...props}
    />
  );
}

function PageHeaderDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-header-description"
      className={cn("text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

export const PageHeader = Object.assign(PageHeaderRoot, {
  Title: PageHeaderTitle,
  Description: PageHeaderDescription,
});
