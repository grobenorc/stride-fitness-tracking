import { createFileRoute } from "@tanstack/react-router";
import { TrainingDashboard } from "@/components/training-dashboard";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Training overview | Stride" },
    { name: "description", content: "Explore Stride's Garmin training dashboard for cycling, running and skiing." },
    { property: "og:title", content: "Training overview | Stride" },
    { property: "og:description", content: "Endurance training, activity and recovery insights in one workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function Index() {
  return <TrainingDashboard />;
}
