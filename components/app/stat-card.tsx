import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string | number;
  emphasized?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-secondary">{label}</p>
        <p
          className={
            emphasized
              ? "mt-1 text-2xl font-semibold text-status-low"
              : "mt-1 text-2xl font-semibold text-foreground"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
