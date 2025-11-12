import { HelmetProvider, Helmet } from "react-helmet-async";
import { useViewport } from "@/hooks/useViewport";

const PageMeta = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  const { mode } = useViewport();
  
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {mode === 'mobile-only' && (
        <>
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        </>
      )}
    </Helmet>
  );
};

export const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  // Don't call useViewport here - it needs to be inside Router context
  // Viewport management is handled in App.tsx instead
  return (
    <HelmetProvider>{children}</HelmetProvider>
  );
};

export default PageMeta;
