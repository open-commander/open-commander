import { getServerSession } from "@/server/auth";

export default async function WhoPage() {
  const session = await getServerSession();
  console.log("session", session);
  return (
    <div>
      <h1>WhoPage</h1>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </div>
  );
}
