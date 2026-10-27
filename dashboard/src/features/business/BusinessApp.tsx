import { useEffect, useState } from "react";
import {
  BusinessApiError,
  businessApi,
  businessLogout,
  restoreBusinessSession,
  type Business,
  type BusinessOwner,
} from "@/api/business";
import { Button } from "@/components/ui/button";
import { ThemeSelect } from "@/features/theme/ThemeSelect";
import { errorMessage } from "@/lib/errors";
import { BusinessLogin } from "./BusinessLogin";
import { BusinessMascot, BusinessFeedback } from "./BusinessFeedback";
import { BusinessWorkspace } from "./BusinessWorkspace";
import { clearBrowserConversations } from "@/sdk/conversationSession";

export const BusinessApp = () => {
  const [owner, setOwner] = useState<BusinessOwner | null>(null);
  const [checking, setChecking] = useState(true),
    [error, setError] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]),
    [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    restoreBusinessSession()
      .then((user) => {
        if (active) setOwner(user);
      })
      .catch((issue: unknown) => {
        if (active && (!(issue instanceof BusinessApiError) || issue.status !== 401))
          setError(
            "Could not reach your connected business. Check that PixelCore is running, then sign in again.",
          );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    const expired = () => {
      clearBrowserConversations();
      setOwner(null);
      setBusinesses([]);
      setSelected("");
      setError("Your session has expired. Sign in to continue.");
    };
    window.addEventListener("smokey:session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("smokey:session-expired", expired);
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!owner) return;
    setLoading(true);
    setError("");
    setBusinesses([]);
    setSelected("");
    businessApi<{ results: Business[] }>("businesses/")
      .then((result) => {
        if (!active) return;
        const allowed = new Set(
          owner.businesses
            .filter((entry) => ["owner", "admin", "manager"].includes(entry.role))
            .map((entry) => entry.public_id),
        );
        const entries = result.results.filter((business) => allowed.has(business.public_id));
        entries.sort(
          (left, right) =>
            Number(right.enabled_modules.includes("smokey")) -
            Number(left.enabled_modules.includes("smokey")),
        );
        setBusinesses(entries);
        setSelected(entries[0]?.public_id || "");
      })
      .catch((issue) => {
        if (active) setError(errorMessage(issue));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [owner]);
  const logout = async () => {
    try {
      await businessLogout();
    } catch {
      /* The local access token is cleared even when the service is unavailable. */
    }
    setOwner(null);
    setBusinesses([]);
    setSelected("");
    setError("");
  };
  if (checking)
    return (
      <div className="grid min-h-screen place-items-center">
        <BusinessMascot state="searching" text="Opening your Smokey dashboard…" />
      </div>
    );
  if (!owner)
    return (
      <BusinessLogin
        initialError={error}
        onLogin={(user) => {
          setError("");
          setOwner(user);
        }}
      />
    );
  const business = businesses.find((entry) => entry.public_id === selected);
  if (!business)
    return (
      <main className="mx-auto max-w-xl space-y-6 px-6 py-16">
        <div className="flex justify-between">
          <h1 className="text-2xl font-semibold">Your Smokey workspace</h1>
          <ThemeSelect />
        </div>
        <BusinessFeedback busy={loading ? "Finding your businesses…" : ""} error={error} />
        {!loading && (
          <p className="text-sm leading-6 text-muted-foreground">
            Your account needs an active owner, administrator, or manager membership in a connected
            business.
          </p>
        )}
        <Button variant="outline" onClick={() => setOwner({ ...owner })}>
          Reload businesses
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            void logout();
          }}
        >
          Sign out
        </Button>
      </main>
    );
  return (
    <BusinessWorkspace
      key={business.public_id}
      business={business}
      businesses={businesses}
      owner={owner}
      onSelect={setSelected}
      onUpdated={(updated) =>
        setBusinesses((current) =>
          current.map((entry) => (entry.public_id === updated.public_id ? updated : entry)),
        )
      }
      onLogout={logout}
    />
  );
};
