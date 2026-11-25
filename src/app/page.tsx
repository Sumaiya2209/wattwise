import HomeClient from "@/components/home/HomeClient";
import { getSessionUser } from "@/lib/session";

export default async function Home() {
  const user = await getSessionUser();
  return <HomeClient loggedIn={!!user} />;
}