import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import IncorporationForm from "@/components/IncorporationForm";
import { EMPTY_INCORPORATION_DATA, IncorporationData } from "@/lib/incorporationTypes";

export const dynamic = "force-dynamic";

export default async function IncorporationPage({ params }: { params: { id: string } }) {
  const c = await db.case.findUnique({
    where: { id: params.id },
    include: { client: true, corp: true },
  });
  if (!c) notFound();

  const saved = c.corp?.incorporationData as unknown as IncorporationData | null;
  const initial: IncorporationData = saved ?? {
    ...EMPTY_INCORPORATION_DATA,
    incFirstName: c.client.firstName,
    incLastName: c.client.lastName,
    incEmail: c.client.email ?? "",
    incPhone: c.client.phone ?? "",
    directors: [{ first: c.client.firstName, last: c.client.lastName, addr: "", resident: "yes", role: "Director & President" }],
    signDate: new Date().toISOString().split("T")[0],
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Link href={`/cases/${c.id}`} className="text-teal text-sm underline">← Back to {c.fileNumber}</Link>
        <h1 className="text-lg font-bold text-navy">🏢 Alberta Articles of Incorporation</h1>
        {c.corp?.incorporationSubmittedAt && (
          <span className="pill pill-green">Sent to registry agent {new Date(c.corp.incorporationSubmittedAt).toLocaleDateString("en-CA")}</span>
        )}
      </div>
      <div className="card">
        <IncorporationForm caseId={c.id} fileNumber={c.fileNumber} initial={initial} />
      </div>
    </div>
  );
}
