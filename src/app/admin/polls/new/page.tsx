import { getAvailablePotBalance } from "@/app/actions/admin";
import { NewPollForm } from "./new-poll-form";

export default async function NewPollPage() {
  const available = await getAvailablePotBalance();
  return <NewPollForm availableBalance={available} />;
}
