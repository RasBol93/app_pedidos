import { CategoryScreen } from "@/components/screens/category-screen";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;

  return <CategoryScreen slug={resolvedParams.category} />;
}
