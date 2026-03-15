import ShowContent from "@/app/components/ShowContent";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ShowPage() {
  return <ShowContent />;
}
