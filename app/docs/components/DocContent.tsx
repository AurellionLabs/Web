'use client';

import { useEffect, useRef } from 'react';

// Load mermaid from CDN (next/script in layout handles the script tag)
// We access it via window.mermaid after the script loads

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    mermaid: any;
  }
}

const EVA_THEME_VARS = {
  background: '#0d0d0d',
  mainBkg: '#141414',
  nodeBorder: '#7a5f28',
  clusterBkg: '#111111',
  clusterBorder: '#3a2e12',
  defaultLinkColor: '#6b5420',
  titleColor: '#c5a55a',
  edgeLabelBackground: '#111111',
  primaryColor: '#141414',
  primaryBorderColor: '#8a6a30',
  primaryTextColor: '#c5a55a',
  secondaryColor: '#111111',
  secondaryBorderColor: '#6b1a1a',
  secondaryTextColor: '#b07070',
  tertiaryColor: '#0f0f0f',
  tertiaryBorderColor: '#2a4a6a',
  tertiaryTextColor: '#5a8aaa',
  lineColor: '#5a4820',
  fontFamily: '"Space Mono", "Courier New", monospace',
  fontSize: '12px',
  actorBkg: '#141414',
  actorBorder: '#6b1a1a',
  actorTextColor: '#c0c0c0',
  actorLineColor: '#4a3810',
  signalColor: '#a08840',
  signalTextColor: '#c5a55a',
  labelBoxBkgColor: '#111111',
  labelBoxBorderColor: '#3a2e12',
  labelTextColor: '#909090',
  activationBkgColor: '#1a1a1a',
  activationBorderColor: '#6b1a1a',
  loopTextColor: '#c5a55a',
  noteBkgColor: '#111111',
  noteBorderColor: '#3a2e12',
  noteTextColor: '#909090',
};

async function waitForMermaid(
  maxMs = 10000,
): Promise<typeof window.mermaid | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (typeof window !== 'undefined' && window.mermaid) return window.mermaid;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export function DocContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>('pre.mermaid-diagram'),
    );
    if (nodes.length === 0) return;

    let cancelled = false;

    (async () => {
      const mermaid = await waitForMermaid();
      if (cancelled || !mermaid) return;

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: EVA_THEME_VARS,
        fontFamily: '"Space Mono", "Courier New", monospace',
        flowchart: { curve: 'cardinal', padding: 20, useMaxWidth: true },
        sequence: { actorMargin: 60, messageMargin: 40, useMaxWidth: true },
      });

      for (let i = 0; i < nodes.length; i++) {
        if (cancelled) break;
        const node = nodes[i];
        const graphDef = node.textContent?.trim() ?? '';
        if (!graphDef) continue;

        const id = `mermaid-${Date.now()}-${i}`;
        const tmp = document.createElement('div');
        tmp.style.cssText =
          'position:absolute;top:-9999px;left:-9999px;visibility:hidden;';
        document.body.appendChild(tmp);

        try {
          const { svg } = await mermaid.render(id, graphDef, tmp);
          if (!cancelled) {
            node.innerHTML = svg;
            // Strip hardcoded pixel dimensions so CSS max-width can scale it
            const svgEl = node.querySelector('svg');
            if (svgEl) {
              svgEl.removeAttribute('width');
              svgEl.removeAttribute('height');
              svgEl.style.width = '100%';
              svgEl.style.height = 'auto';
            }
            node.classList.add('mermaid-rendered');
          }
        } catch (err) {
          console.warn('[Mermaid] diagram', i, err);
        } finally {
          tmp.remove();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className="doc-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
