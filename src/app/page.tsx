import { Suspense } from "react";
import HomeClient from "@/components/home/HomeClient";
import { getSessionUser } from "@/lib/session";

export default function Home() {
  return (
    <Suspense fallback={<HomeClient loggedIn={false} />}>
      <SessionHome />
    </Suspense>
  );
}

async function SessionHome() {
  const user = await getSessionUser();
  return <HomeClient loggedIn={!!user} />;
}