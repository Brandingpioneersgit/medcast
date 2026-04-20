import { requireAuth } from "@/lib/auth";
import { LiveFeed } from "./feed";

export const dynamic = "force-dynamic";

export default async function AdminLivePage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Live activity</h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time feed of inquiries, appointments, reviews, flags, price watches, and Q&amp;A submissions. Connects via Server-Sent Events; one event = one line.
        </p>
      </div>
      <LiveFeed />
    </div>
  );
}
