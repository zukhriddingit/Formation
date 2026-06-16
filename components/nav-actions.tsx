import { AccountMenu } from "@/components/account-menu";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavActions() {
  return (
    <div className="flex items-center gap-2">
      <AccountMenu />
      <ThemeToggle />
    </div>
  );
}
