import { getCurrentContext, getTeamData } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";
import { TeamSection } from "./team-section";

export default async function SettingsPage() {
  const { profile, organization } = await getCurrentContext();
  const team = await getTeamData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-secondary">
          Configure how StockFlow evaluates your inventory.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>Default thresholds applied to every product.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm defaultValue={organization.default_low_stock_threshold} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Read-only account details.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Name</span>
            <span className="text-sm text-secondary">{organization.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Account email</span>
            <span className="text-sm text-secondary">{profile.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Your role</span>
            <span className="text-sm text-secondary">
              {profile.role === "owner" ? "Owner" : "Member"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            {team.isOwner
              ? "Manage who can access this organization and what they can do."
              : "People with access to this organization."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamSection
            members={team.members}
            invites={team.invites}
            currentUserId={team.currentUserId}
            isOwner={team.isOwner}
          />
        </CardContent>
      </Card>
    </div>
  );
}
