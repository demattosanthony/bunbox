import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DocsSidebar } from "@/components/docs-sidebar";

export function MobileDocsSidebar() {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    console.log("open", open);

    setOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={handleClick}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Documentation</SheetTitle>
        </SheetHeader>
        <div onClick={() => setOpen(false)}>
          <DocsSidebar />
        </div>
      </SheetContent>
    </Sheet>
  );
}
