import type { APIRoute, GetStaticPaths } from 'astro';
import { bundledStylePages, bundleCapturedStyles } from '../../lib/captured-styles';
import { loadPage } from '../../lib/site';

export const getStaticPaths: GetStaticPaths = () =>
  bundledStylePages.flatMap(page =>
    bundleCapturedStyles(page, loadPage(page).head).bundles.map(({ filename, css }) => ({
      params: { bundle: filename },
      props: { css },
    }))
  );

export const GET: APIRoute = ({ props }) =>
  new Response(props.css, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
