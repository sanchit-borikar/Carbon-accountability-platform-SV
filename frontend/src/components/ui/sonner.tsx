import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-[320px] rounded-lg border group-[.toaster]:border-[#e2e8f0] border-l-4 transition-all duration-300 overflow-hidden",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-l-[#059669]",
          error: "group-[.toaster]:border-l-[#dc2626]",
          warning: "group-[.toaster]:border-l-[#d97706]",
          info: "group-[.toaster]:border-l-[#2563eb]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
