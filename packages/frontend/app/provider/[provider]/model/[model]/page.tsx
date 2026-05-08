import ProviderModelDetailPage from "@/components/provider-model/ProviderModelDetailPage";

type ProviderModelDetailRouteProps = {
  params: {
    provider: string;
    model: string;
  };
};

export default function ProviderModelDetailRoute({ params }: ProviderModelDetailRouteProps) {
  return <ProviderModelDetailPage params={params} />;
}
