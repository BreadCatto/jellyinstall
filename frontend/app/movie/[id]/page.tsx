import MovieContent from "@/app/components/MovieContent";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function MoviePage() {
  return <MovieContent />;
}
