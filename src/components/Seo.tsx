import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '@/config';

interface SeoProps {
  title: string;
  description: string;
  /** Path beginning with "/". Canonical becomes SITE_URL + path. */
  path?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
}

export function Seo({ title, description, path, jsonLd, noindex }: SeoProps) {
  const canonical = path ? `${SITE_URL}${path}` : undefined;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      {noindex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {canonical && <meta property="og:url" content={canonical} />}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
