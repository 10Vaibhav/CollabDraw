import { ReactNode } from "react";
import Button from "@/components/Button";

export default function Layout({
  children
}: { children: ReactNode }) {
  return (
    <div>
      <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
        <Button href="/" size="sm" variant="outline">
          Home
        </Button>
      </div>
      {children}
    </div>
  );
}
