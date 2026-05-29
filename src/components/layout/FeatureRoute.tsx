import type { ReactNode } from "react";
import { FeatureErrorBoundary } from "@/components/common/FeatureErrorBoundary";

type FeatureRouteProps = {
  title: string;
  children: ReactNode;
};

export function FeatureRoute({ title, children }: FeatureRouteProps) {
  return <FeatureErrorBoundary title={title}>{children}</FeatureErrorBoundary>;
}
